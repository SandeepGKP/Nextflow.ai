"use client";

import React, { useRef, useState } from "react";
import { Handle } from "reactflow";

enum Position {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom",
}
import BaseNode from "./BaseNode";
import { useWorkflowStore, BaseNodeData } from "@/store/workflowStore";
import { Video, X } from "lucide-react";
import { uploadViaTransloadit } from "@/lib/transloadit";

export default function UploadVideoNode({ id, data, selected }: { id: string; data: BaseNodeData; selected?: boolean }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        await new Promise((r) => setTimeout(r, 800));
        url = URL.createObjectURL(file);
      }

      updateNodeData(id, { videoUrl: url, status: "success" });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
      updateNodeData(id, { status: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <BaseNode id={id} nodeType="uploadVideo" data={data} selected={selected}>
      {(data.videoUrl && data.videoUrl !== "undefined") ? (
        <div className="relative w-full h-28 rounded-lg overflow-hidden border border-zinc-700 bg-black">
          <video src={data.videoUrl} controls className="w-full h-full object-contain" />
          <button
            onClick={() => updateNodeData(id, { videoUrl: null, status: "idle" })}
            className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black transition z-10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          className="w-full h-20 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <Video className="w-5 h-5 text-zinc-500 mb-1" />
          <span className="text-[11px] text-zinc-500">mp4, mov, webm, m4v</span>
          <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="hidden" onChange={handleFileChange} />
        </div>
      )}
      {isUploading && <p className="text-[11px] text-blue-400 animate-pulse text-center">Uploading…</p>}
      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900" />
    </BaseNode>
  );
}
