import { task } from "@trigger.dev/sdk/v3";
import crypto from "crypto";

const AUTH_KEY = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY || "";
const AUTH_SECRET = process.env.TRANSLOADIT_AUTH_SECRET || "";

/** Helper to sign Transloadit parameters */
function signParams(params: any) {
  const json = JSON.stringify(params);
  const signature = crypto.createHmac("sha384", AUTH_SECRET).update(json).digest("hex");
  return { params: json, signature: `sha384:${signature}` };
}

/** Helper to poll Transloadit assembly until completion */
async function pollAssembly(assemblyUrl: string, maxAttempts = 30): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(assemblyUrl);
    const data = (await res.json()) as any;
    if (data.ok === "ASSEMBLY_COMPLETED") {
       const results = Object.values(data.results || {}).flat() as any[];
       if (results.length > 0) return results[0].ssl_url || results[0].url;
       throw new Error("Assembly completed but no results found");
    }
    if (data.error) throw new Error(`Transloadit error: ${data.message || data.error}`);
  }
  throw new Error("Transloadit assembly timed out");
}

interface CropPayload {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeId: string;
}

interface ExtractPayload {
  videoUrl: string;
  timestamp: string;
  nodeId: string;
}

export const executeCropImage = task({
  id: "execute-crop-image",
  run: async (payload: CropPayload): Promise<{ croppedUrl: string }> => {
    // Implement real crop using Transloadit /image/resize
    const params = {
      auth: { key: AUTH_KEY, expires: new Date(Date.now() + 600000).toISOString() },
      steps: {
        import: { robot: "/http/import", url: payload.imageUrl },
        crop: {
          use: "import",
          robot: "/image/resize",
          crop: {
            x1: `${payload.x || 0}%`,
            y1: `${payload.y || 0}%`,
            x2: `${(payload.x || 0) + (payload.width || 100)}%`,
            y2: `${(payload.y || 0) + (payload.height || 100)}%`
          }
        }
      }
    };

    const { params: json, signature } = signParams(params);
    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ params: json, signature }).toString(),
    });

    const assembly = (await res.json()) as any;
    if (assembly.error) throw new Error(`Transloadit failed: ${assembly.message}`);
    
    const croppedUrl = await pollAssembly(assembly.assembly_ssl_url || assembly.assembly_url);
    return { croppedUrl };
  },
});

export const executeExtractFrame = task({
  id: "execute-extract-frame",
  run: async (payload: ExtractPayload): Promise<{ frameUrl: string }> => {
    // Implement real frame extraction using Transloadit /video/thumbs
    const params = {
      auth: { key: AUTH_KEY, expires: new Date(Date.now() + 600000).toISOString() },
      steps: {
        import: { robot: "/http/import", url: payload.videoUrl },
        extract: {
          use: "import",
          robot: "/video/thumbs",
          offsets: [parseFloat(payload.timestamp || "0")],
          count: 1,
          format: "jpg"
        }
      }
    };

    const { params: json, signature } = signParams(params);
    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ params: json, signature }).toString(),
    });

    const assembly = (await res.json()) as any;
    if (assembly.error) throw new Error(`Transloadit failed: ${assembly.message}`);
    
    const frameUrl = await pollAssembly(assembly.assembly_ssl_url || assembly.assembly_url);
    return { frameUrl };
  },
});
