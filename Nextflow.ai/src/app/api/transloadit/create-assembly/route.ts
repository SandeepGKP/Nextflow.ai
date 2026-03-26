import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Server-side proxy to create a Transloadit assembly.
 * This keeps TRANSLOADIT_AUTH_SECRET server-side only.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;
  if (!authKey || !authSecret) {
    return NextResponse.json({ error: "Transloadit keys not configured" }, { status: 500 });
  }

  const { params } = await req.json();

  // Sign the params with the auth secret
  const paramsStr = JSON.stringify(params);
  const signature = crypto
    .createHmac("sha384", authSecret)
    .update(Buffer.from(paramsStr, "utf-8"))
    .digest("hex");

  // Create the assembly
  const form = new FormData();
  form.append("params", paramsStr);
  form.append("signature", `sha384:${signature}`);

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (data.error) {
    console.error("Transloadit API Error:", data);
    return NextResponse.json({ error: data.error, message: data.message }, { status: 400 });
  }

  return NextResponse.json({
    assembly_url: data.assembly_url,
    assembly_ssl_url: data.assembly_ssl_url,
    signature: `sha384:${signature}`,
  });
}
