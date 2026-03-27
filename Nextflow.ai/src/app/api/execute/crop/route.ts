import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  imageUrl: z.string(),
  x: z.coerce.number().catch(0),
  y: z.coerce.number().catch(0),
  width: z.coerce.number().catch(100),
  height: z.coerce.number().catch(100),
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
    console.error("JSON PARSE ERROR IN CROP. RAW BODY TRUNCATED?:", rawBody.substring(0, 100), "...");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error("CROP ZOD ERROR:", JSON.stringify(parsed.error.flatten(), null, 2));
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { imageUrl, x, y, width, height, nodeId, workflowRunId } = parsed.data;

  try {
    const nodeStartedAt = new Date();
    
    // Trigger task
    const handle = await tasks.trigger("execute-crop-image", {
      imageUrl, x, y, width, height, nodeId
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
      const croppedUrl = (polledRun.output as any).croppedUrl;

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
      throw new Error(`Crop task failed: ${polledRun.status}`);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
