import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  videoUrl: z.string().url(),
  timestamp: z.string(),
  nodeId: z.string(),
  workflowRunId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { videoUrl, timestamp, nodeId, workflowRunId } = parsed.data;

  try {
    const nodeStartedAt = new Date();

    const result = await tasks.triggerAndWait("execute-extract-frame", {
      videoUrl, timestamp, nodeId
    });

    if (result.ok) {
      const frameUrl = (result.output as any).frameUrl;

      if (workflowRunId) {
        await prisma.nodeRun.create({
          data: {
            workflowRunId, nodeId, nodeType: "extractFrame",
            status: "success",
            inputs: { timestamp },
            outputs: { frameUrl },
            startedAt: nodeStartedAt,
            finishedAt: new Date(),
          }
        });
      }

      return NextResponse.json({ frameUrl });
    } else {
      throw new Error(`Extract frame task failed: ${result.error}`);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
