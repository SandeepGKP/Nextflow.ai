import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  videoUrl: z.string(),
  timestamp: z.coerce.string().catch("0"),
  nodeId: z.string(),
  workflowRunId: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawBody = await req.text();
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error("JSON PARSE ERROR IN EXTRACT. RAW BODY TRUNCATED?:", rawBody.substring(0, 100), "...");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error("EXTRACT ZOD ERROR:", JSON.stringify(parsed.error.flatten(), null, 2));
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { videoUrl, timestamp, nodeId, workflowRunId } = parsed.data;

  try {
    const nodeStartedAt = new Date();

    const handle = await tasks.trigger("execute-extract-frame", {
      videoUrl, timestamp, nodeId
    });

    let polledRun;
    while (true) {
      polledRun = await runs.retrieve(handle.id);
      if (
        polledRun.status === "COMPLETED" ||
        polledRun.status === "FAILED" ||
        polledRun.status === "CANCELED" ||
        polledRun.status === "SYSTEM_FAILURE" ||
        polledRun.status === "CRASHED"
      ) {
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (polledRun.status === "COMPLETED") {
      const frameUrl = (polledRun.output as any).frameUrl;

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
      throw new Error(`Extract frame task failed: ${polledRun.status}`);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
