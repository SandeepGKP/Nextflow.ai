import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workflowId, scope } = await req.json();

  try {
    const user = await getOrCreateUser(clerkId);
    
    const run = await prisma.workflowRun.create({
      data: {
        ...(workflowId ? { workflowId } : {}),
        userId: user.id,
        status: "running",
        scope: scope || "full",
      },
    });

    return NextResponse.json({ runId: run.id });
  } catch (error) {
    console.error("Run Creation Error:", error);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId, status, duration } = await req.json();

  try {
    const run = await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status,
        duration,
        finishedAt: status !== "running" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update run" }, { status: 500 });
  }
}
