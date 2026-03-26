import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user";

const workflowSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  workflowId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = workflowSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, nodes, edges, workflowId } = parsed.data;

  try {
    const user = await getOrCreateUser(clerkId);
    
    let workflow;
    if (workflowId) {
      workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: { name, json: { nodes, edges } },
      });
    } else {
      workflow = await prisma.workflow.create({
        data: { name, json: { nodes, edges }, userId: user.id },
      });
    }

    return NextResponse.json({ success: true, workflow });
  } catch (error: any) {
    console.error("Workflow Save Error:", error);
    return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get("id");

  try {
    const workflows = workflowId
      ? await prisma.workflow.findMany({ 
          where: { id: workflowId, user: { clerkId } } 
        })
      : await prisma.workflow.findMany({ 
          where: { user: { clerkId } },
          orderBy: { updatedAt: "desc" }
        });

    return NextResponse.json({ workflows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });

  try {
    await prisma.workflow.delete({
      where: { id, user: { clerkId } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workflow Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
