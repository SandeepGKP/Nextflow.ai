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

      let combinedText = payload.userMessage || "Please analyze these images.";
      if (payload.systemPrompt && payload.imageBase64s?.length) {
        combinedText = `CONTEXT/INSTRUCTIONS:\n${payload.systemPrompt}\n\nUSER REQUEST:\n${combinedText}`;
      }

      const parts: Part[] = [{ text: combinedText }];
      const imageInputs = payload.imageBase64s || [];

      if (imageInputs.length > 0) {
        for (const input of imageInputs) {
          if (!input || typeof input !== "string") continue;
          let data: string;
          let mimeType = "image/jpeg";
          if (input.startsWith("http")) {
            const res = await fetch(input);
            if (!res.ok) continue;
            data = Buffer.from(await res.arrayBuffer()).toString("base64");
            mimeType = res.headers.get("content-type") || "image/jpeg";
          } else if (input.includes(";base64,")) {
            const [prefix, encoded] = input.split(";base64,");
            data = encoded;
            mimeType = prefix.split(":")[1] || "image/jpeg";
          } else {
            data = input;
          }
          parts.push({ inlineData: { data, mimeType } });
        }
      }

      const result = await geminiModel.generateContent({ contents: [{ role: "user", parts }] });
      return { output: result.response.text() };

    } catch (geminiErr: any) {
      const isConflict = geminiErr.message?.includes("409") || geminiErr.message?.includes("status: 409");
      const isQuota = geminiErr.message?.includes("429") || geminiErr.message?.includes("quota");
      
      console.warn(`[GeminiTask] Gemini failed (Status: ${isConflict ? '409' : (isQuota ? '429' : 'Error')}). Failing over to Groq...`);

      // 2. FALLBACK TO GROQ
      try {
        const imageInputs = payload.imageBase64s || [];
        const groqParts: any[] = [{ type: "text", text: payload.userMessage || "Analyze this." }];
        
        if (payload.systemPrompt) {
          groqParts.unshift({ type: "text", text: `SYSTEM: ${payload.systemPrompt}` });
        }

        // Support images in Groq (Llama 3.2 Vision)
        for (const img of imageInputs) {
          if (img.startsWith("http")) {
             groqParts.push({ type: "image_url", image_url: { url: img } });
          } else if (img.includes(";base64,")) {
             groqParts.push({ type: "image_url", image_url: { url: img } });
          }
        }

        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: groqParts as any }],
          model: "qwen/qwen3-32b", // Requested fallback model
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
