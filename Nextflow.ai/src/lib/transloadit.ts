/**
 * Transloadit upload helper — no template required.
 *
 * Uses the Transloadit REST API directly:
 * 1. Create an Assembly with inline "steps" (just /upload/handle to store the file)
 * 2. POST the file as multipart form data to the created assembly URL
 * 3. Poll until the assembly finishes, then return the CDN URL
 *
 * Env vars needed in .env.local:
 *   NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY=your_key
 *   TRANSLOADIT_AUTH_SECRET=your_secret   (server-side only)
 */

const TRANSLOADIT_BASE = "https://api2.transloadit.com";

export interface TransloaditResult {
  url: string;
  name: string;
  mime: string;
  size: number;
}

/** Create a signed Transloadit assembly and upload a file. Returns the CDN URL. */
export async function uploadViaTransloadit(file: File): Promise<TransloaditResult> {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
  if (!authKey) throw new Error("NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY is not set");

  // Build assembly params – inline "store" step (no template needed)
  const params = {
    auth: {
      key: authKey,
      // expires in 1 hour
      expires: new Date(Date.now() + 60 * 60 * 1000)
        .toISOString()
        .replace(/T/, " ")
        .replace(/\.\d{3}Z$/, "+00:00")
        .replace(/-/g, "/"),
    },
    steps: {
      // Use the 'hash' robot because it's universal and works for any file type (image OR video)
      // without needing a template or external storage provider.
      process: {
        use: ":original",
        robot: "/file/hash",
      },
    },
  };

  // Step 1: Get the signature from our server
  const signRes = await fetch("/api/transloadit/sign-params", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to sign Transloadit parameters");
  }

  const { signature } = await signRes.json();

  // Step 2: POST the file to Transloadit in a single request (most robust way)
  const form = new FormData();
  form.append("params", JSON.stringify(params));
  form.append("signature", signature);
  form.append("file", file);

  const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: form,
  });

  const uploadData = await uploadRes.json();
  if (uploadData.error || uploadRes.status >= 400) {
    console.error("Transloadit Upload Error:", uploadData);
    throw new Error(uploadData.error || uploadData.message || "Upload failed to start.");
  }

  // Step 3: Poll until complete
  const finalData = await pollAssembly(uploadData.assembly_ssl_url || uploadData.assembly_url);

  // Grab the result URL from results (robot output) OR uploads (fallback)
  const robotResults = Object.values(finalData.results || {}).flat() as any[];
  const uploadResults = finalData.uploads || [];
  const results = [...robotResults, ...uploadResults];
  
  if (!results.length) throw new Error("Transloadit returned no file results");

  const r = results[0];
  const url = r.ssl_url || r.url;
  
  if (!url) {
    console.error("Transloadit result missing URL:", r);
    throw new Error("Transloadit returned a result but no public URL was found.");
  }

  const finalResult = { url, name: r.name, mime: r.mime, size: r.size };
  console.log("Transloadit Upload Success:", finalResult);
  return finalResult;
}

async function pollAssembly(assemblyUrl: string, maxAttempts = 20): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(assemblyUrl);
    const data = await res.json();
    if (data.ok === "ASSEMBLY_COMPLETED") return data;
    if (data.error) throw new Error(`Transloadit error: ${data.error}`);
  }
  throw new Error("Transloadit assembly timed out");
}
