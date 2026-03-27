import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import Groq from "groq-sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

interface GeminiPayload {
  model: string;
  systemPrompt?: string;
  userMessage: string;
  imageBase64s?: string[];
  nodeId: string;
  workflowRunId?: string;
}

export const executeGeminiLLM = task({
  id: "execute-gemini-llm",
  run: async (payload: GeminiPayload): Promise<{ output: string }> => {
    // 1. TRY GEMINI FIRST
    try {
      let modelName = payload.model || "gemini-1.5-flash";
      if (modelName.includes("1.5-flash")) modelName = "gemini-flash-latest";
      if (modelName.includes("1.5-pro")) modelName = "gemini-pro-latest";
      
      const finalModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
      const geminiModel = genAI.getGenerativeModel({
        model: finalModelName,
        ...(payload.systemPrompt && !payload.imageBase64s?.length ? { systemInstruction: payload.systemPrompt } : {}),
      }, { apiVersion: "v1beta" });

      const imageInputs = payload.imageBase64s || [];
      let internalAnalysis = "";

      // INTERNAL CLASSIFICATION (HIDDEN ENRICHMENT)
      if (imageInputs.length > 0) {
        try {
          const classifierModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1beta" });
          const classifierParts: Part[] = [{ text: "Identify all distinct objects, text, colors, and layout elements in these images. List them clearly as comma-separated tags." }];
          
          for (const input of imageInputs) {
            let data: string, mimeType = "image/jpeg";
            if (input.startsWith("http")) {
              const res = await fetch(input);
              if (res.ok) {
                data = Buffer.from(await res.arrayBuffer()).toString("base64");
                mimeType = res.headers.get("content-type") || "image/jpeg";
                classifierParts.push({ inlineData: { data, mimeType } });
              }
            } else if (input.includes(";base64,")) {
              const [prefix, encoded] = input.split(";base64,");
              classifierParts.push({ inlineData: { data: encoded, mimeType: prefix.split(":")[1] || "image/jpeg" } });
            }
          }
          
          if (classifierParts.length > 1) {
            const analysisResult = await classifierModel.generateContent({ contents: [{ role: "user", parts: classifierParts }] });
            internalAnalysis = analysisResult.response.text();
          }
        } catch (e) {
          console.warn("[GeminiTask] Internal classification failed, proceeding with raw prompt.");
        }
      }

      let combinedText = payload.userMessage || "Please analyze these images.";
      if (internalAnalysis) {
        combinedText = `[INTERNAL IMAGE ANALYSIS: ${internalAnalysis}]\n\nUSER REQUEST: ${combinedText}`;
      }
      if (payload.systemPrompt) {
        combinedText = `SYSTEM CONTEXT:\n${payload.systemPrompt}\n\n${combinedText}`;
      }

      const parts: Part[] = [{ text: combinedText }];
      if (imageInputs.length > 0) {
        for (const input of imageInputs) {
          if (!input || typeof input !== "string") continue;
          let data: string, mimeType = "image/jpeg";
          if (input.startsWith("http")) {
            const res = await fetch(input);
            if (!res.ok) continue;
            data = Buffer.from(await res.arrayBuffer()).toString("base64");
            mimeType = res.headers.get("content-type") || "image/jpeg";
          } else if (input.includes(";base64,")) {
            const [prefix, encoded] = input.split(";base64,");
            data = encoded;
            mimeType = prefix.split(":")[1] || "image/jpeg";
          } else { data = input; }
          parts.push({ inlineData: { data, mimeType } });
        }
      }

      const result = await geminiModel.generateContent({ contents: [{ role: "user", parts }] });
      return { output: result.response.text() };

    } catch (geminiErr: any) {
      const isConflict = geminiErr.message?.includes("409") || geminiErr.message?.includes("status: 409");
      const isQuota = geminiErr.message?.includes("429") || geminiErr.message?.includes("quota");
      
      console.warn(`[GeminiTask] Primary Gemini failed (Status: 429/409/Error). Attempting Gemini failover...`);

      if (isQuota) {
        // Try other Gemini vision models before resorting to Groq text
        const backupModels = ["gemini-1.5-pro", "gemini-1.5-flash"];
        for (const backup of backupModels) {
          try {
             console.log(`[GeminiTask] Trying backup model: ${backup}`);
             const fallbackModel = genAI.getGenerativeModel({
                 model: `models/${backup}`,
                 ...(payload.systemPrompt && !payload.imageBase64s?.length ? { systemInstruction: payload.systemPrompt } : {}),
             }, { apiVersion: "v1beta" });
             
             // 'parts' is block scoped to the first try, we need to rebuild it or access it.
             // Rebuild parts carefully:
             let combinedText = payload.userMessage || "Please analyze these images.";
             if (payload.systemPrompt && payload.imageBase64s?.length) combinedText = `CONTEXT/INSTRUCTIONS:\n${payload.systemPrompt}\n\nUSER REQUEST:\n${combinedText}`;
             const fallbackParts: Part[] = [{ text: combinedText }];
             const imageInputs = payload.imageBase64s || [];
             if (imageInputs.length > 0) {
               for (const input of imageInputs) {
                 if (!input || typeof input !== "string") continue;
                 let data: string, mimeType = "image/jpeg";
                 if (input.startsWith("http")) {
                   const res = await fetch(input);
                   if (!res.ok) continue;
                   data = Buffer.from(await res.arrayBuffer()).toString("base64");
                   mimeType = res.headers.get("content-type") || "image/jpeg";
                 } else if (input.includes(";base64,")) {
                   const [prefix, encoded] = input.split(";base64,");
                   data = encoded;
                   mimeType = prefix.split(":")[1] || "image/jpeg";
                 } else { data = input; }
                 fallbackParts.push({ inlineData: { data, mimeType } });
               }
             }

             const result = await fallbackModel.generateContent({ contents: [{ role: "user", parts: fallbackParts }] });
             return { output: result.response.text() };
          } catch (e) {
             console.warn(`[GeminiTask] Backup ${backup} failed.`);
          }
        }
      }

      console.warn(`[GeminiTask] All Gemini fallback models exhausted. Failing over to Groq...`);

      // 2. FALLBACK TO GROQ
      try {
        const imageInputs = payload.imageBase64s || [];
        let finalContent: string | any[];

        if (imageInputs.length > 0) {
          const groqParts: any[] = [{ type: "text", text: payload.userMessage || "Analyze this." }];
          if (payload.systemPrompt) {
            groqParts.unshift({ type: "text", text: `SYSTEM: ${payload.systemPrompt}` });
          }
          for (const img of imageInputs) {
            if (img.startsWith("http") || img.includes(";base64,")) {
               groqParts.push({ type: "image_url", image_url: { url: img } });
            }
          }
          finalContent = groqParts;
        } else {
          finalContent = `${payload.systemPrompt ? `SYSTEM: ${payload.systemPrompt}\n\n` : ""}${payload.userMessage || "Hello"}`;
        }

        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: finalContent as any }],
          model: "meta-llama/llama-4-scout-17b-16e-instruct", // Requested fallback model
        });

        const content = completion.choices[0]?.message?.content || "";
        const sanitizedContent = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/gi, "").trim();
        return { output: sanitizedContent || "[Groq Fallback Empty]" };
      } catch (groqErr: any) {
        console.error("[GeminiTask] Both Gemini and Groq failed:", groqErr);
        return { output: `[Critical Error] Gemini: ${geminiErr.message}. Groq: ${groqErr.message}` };
      }
    }
  },
});
