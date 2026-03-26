import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  imageUrl: z.string().url(),
  x: z.coerce.number(),
  y: z.coerce.number(),
  width: z.coerce.number(),
  height: z.coerce.number(),
  nodeId: z.string(),
  workflowRunId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { imageUrl, x, y, width, height, nodeId, workflowRunId } = parsed.data;

  try {
    const nodeStartedAt = new Date();
    
    // Trigger task
    const result = await tasks.triggerAndPoll("execute-crop-image", {
      imageUrl, x, y, width, height, nodeId
    });

    if (result.status === "COMPLETED") {
      const croppedUrl = (result.output as any).croppedUrl;

      if (workflowRunId) {
        await prisma.nodeRun.create({
          data: {
            workflowRunId, nodeId, nodeType: "cropImage",
            status: "success",
            inputs: { x, y, width, height },
            outputs: { croppedUrl },
            startedAt: nodeStartedAt,
            finishedAt: new Date(),
          }
        });
      }

      return NextResponse.json({ croppedUrl });
    } else {
      throw new Error(`Crop task failed: ${result.status}`);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
