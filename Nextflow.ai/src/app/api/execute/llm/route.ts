import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user";

const executeSchema = z.object({
  model: z.string(),
  systemPrompt: z.string().optional(),
  userMessage: z.string(),
  imageBase64s: z.array(z.string()).optional(),
  nodeId: z.string(),
  workflowRunId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { model, systemPrompt, userMessage, imageBase64s, nodeId, workflowRunId } = parsed.data;

  try {
    const user = await getOrCreateUser(clerkId);
    const nodeStartedAt = new Date();

    // Trigger and wait for the LLM task on Trigger.dev
    const result = await tasks.triggerAndWait("execute-gemini-llm", {
      model,
      systemPrompt,
      userMessage,
      imageBase64s,
      nodeId,
    });

    if (result.ok) {
      const output = (result.output as any).output;

      // Persistence
      if (workflowRunId) {
        await prisma.nodeRun.create({
          data: {
            workflowRunId,
            nodeId,
            nodeType: "runLlm",
            status: "success",
            inputs: { model, userMessage },
            outputs: { output },
            startedAt: nodeStartedAt,
            finishedAt: new Date(),
          }
        });
      }

      return NextResponse.json({ output });
    } else {
      // Check for 429/Quota errors to trigger frontend retry
      const errorMsg = JSON.stringify(result);
      if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
        return NextResponse.json({ error: "Gemini Quota Exceeded" }, { status: 429 });
      }
      throw new Error(`Trigger.dev task failed: ${result.error}`);
    }

  } catch (error: any) {
    console.error("LLM Execution Error:", error);
    return NextResponse.json({ error: error.message || "LLM execution failed" }, { status: 500 });
  }
}
