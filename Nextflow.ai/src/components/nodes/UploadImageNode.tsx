"use client";

import React, { useRef, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import BaseNode from "./BaseNode";
import { useWorkflowStore, BaseNodeData } from "@/store/workflowStore";
import { UploadCloud, X, Maximize2, Minimize2 } from "lucide-react";
import { uploadViaTransloadit } from "@/lib/transloadit";

export default function UploadImageNode({ id, data, selected }: NodeProps<BaseNodeData>) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    updateNodeData(id, { status: "running" });

    try {
      const hasTransloadit = !!process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
      let url: string;

      if (hasTransloadit) {
        const result = await uploadViaTransloadit(file);
        url = result.url;
      } else {
        // Fallback: local blob URL (dev only — not persistent)
        await new Promise((r) => setTimeout(r, 800));
        url = URL.createObjectURL(file);
      }

      updateNodeData(id, { imageUrl: url, status: "success" });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
      updateNodeData(id, { status: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <BaseNode id={id} nodeType="uploadImage" data={data} selected={selected}>
      {(data.imageUrl && data.imageUrl !== "undefined") ? (
        <div className="relative w-full min-h-[120px] rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 group">
          <img src={data.imageUrl} alt="Preview" className="object-contain w-full h-full bg-black/20 " />
          
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              title="Expand View"
              className="bg-zinc-900/90 text-white rounded-md p-1.5 hover:bg-zinc-800 border border-zinc-700 transition backdrop-blur-md"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateNodeData(id, { imageUrl: null, status: "idle" }); }}
              title="Remove"
              className="bg-red-900/90 text-white rounded-md p-1.5 hover:bg-red-800 border border-red-700 transition backdrop-blur-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full Screen Overlay */}
          {isExpanded && (
            <div 
              className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-10 cursor-default"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            >
              <div className="relative max-w-5xl max-h-full">
                <img 
                  src={data.imageUrl} 
                  alt="Full preview" 
                  className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-zinc-800 object-contain" 
                />
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 transition backdrop-blur-sm border border-white/20"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Collapse</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full min-h-[120px] border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-6 h-6 text-zinc-500 mb-2" />
          <span className="text-xs text-zinc-500">Click to upload image</span>
          <span className="text-[10px] text-zinc-600 mt-1 uppercase tracking-tighter">JPG, PNG, WEBP</span>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}
      {isUploading && <p className="text-[11px] text-blue-400 animate-pulse text-center">Uploading…</p>}
      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900" />
    </BaseNode>
  );
}
