import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Server-side route to sign Transloadit params.
 * This keeps TRANSLOADIT_AUTH_SECRET server-side only.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json({ error: "Transloadit secret not configured" }, { status: 500 });
  }

  const { params } = await req.json();
  const paramsStr = JSON.stringify(params);

  const signature = crypto
    .createHmac("sha384", authSecret)
    .update(Buffer.from(paramsStr, "utf-8"))
    .digest("hex");

  return NextResponse.json({
    signature: `sha384:${signature}`,
  });
}
