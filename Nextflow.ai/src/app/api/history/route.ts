import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  console.log("DEBUG: GET /api/history hit");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get("workflowId");

  try {
    const runs = await prisma.workflowRun.findMany({
      where: { 
        workflowId: workflowId ?? undefined, 
        user: { clerkId } 
      },
      include: { nodeRuns: true },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("History Fetch Error! Full Details:", {
      clerkId,
      workflowId,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return NextResponse.json({ error: "Failed to fetch history", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      await prisma.workflowRun.delete({
        where: { id, user: { clerkId } },
      });
    } else {
      await prisma.workflowRun.deleteMany({
        where: { user: { clerkId } },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History Deletion Error:", error);
    return NextResponse.json({ error: "Failed to delete history" }, { status: 500 });
  }
}
