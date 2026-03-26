"use client";

import React, { useState } from "react";
import { Play, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";

type NodeStatus = "idle" | "running" | "success" | "error";

const NODE_TYPE_ICONS: Record<string, string> = {
  text:        "T",
  uploadImage: "🖼",
  uploadVideo: "🎥",
  cropImage:   "✂️",
  extractFrame:"🎞",
  runLlm:      "✦",
};

interface BaseNodeProps {
  id: string;
  nodeType?: string;
  data: { label: string; status: NodeStatus; [key: string]: any };
  selected?: boolean;
  children: React.ReactNode;
}

export default function BaseNode({ id, nodeType, data, selected, children }: BaseNodeProps) {
  const executeNode = useWorkflowStore((s) => s.executeNode);
  const [isRunning, setIsRunning] = useState(false);
  const status = data.status;

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(true);
    await executeNode(id);
    setIsRunning(false);
  };

  let borderClass = "border-zinc-700/80";
  let shadowClass = "";
  if (status === "running") { borderClass = "border-blue-500"; shadowClass = "shadow-[0_0_20px_rgba(59,130,246,0.4)]"; }
  else if (status === "success") { borderClass = "border-emerald-500/70"; }
  else if (status === "error")   { borderClass = "border-red-500/70"; }
  else if (selected)             { borderClass = "border-zinc-500"; }

  return (
    <>
      <NodeResizer 
        color="#6366f1" 
        isVisible={selected} 
        minWidth={260} 
        minHeight={100}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1', border: 'none' }}
        lineStyle={{ border: '1px solid #6366f1' }}
      />
      <div
        className={`min-w-[260px] w-full h-full bg-zinc-900/95 backdrop-blur rounded-xl border ${borderClass} ${shadowClass} ${status === "running" ? "animate-pulse" : ""} overflow-visible shadow-xl transition-all duration-200 flex flex-col`}
      >
      {/* Header */}
      <div className="bg-zinc-800/60 px-3 py-2 flex items-center justify-between border-b border-zinc-700/50 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{NODE_TYPE_ICONS[nodeType || ""] || "⬡"}</span>
          <span className="text-xs font-semibold text-zinc-300 tracking-wide truncate">{data.label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Status indicator */}
          {status === "running" && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
          {status === "success" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          {status === "error"   && <XCircle className="w-3.5 h-3.5 text-red-400" />}
          {/* Run single-node button */}
          <button
            onClick={handleRun}
            disabled={isRunning || status === "running"}
            title="Run this node"
            className="p-1 rounded text-zinc-500 hover:text-indigo-400 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Play className="w-3 h-3" />
          </button>
        </div>
      </div>
      {/* Body */}
      <div className="p-3 flex flex-col gap-3 flex-grow overflow-y-auto custom-scrollbar-premium">{children}</div>
    </div>
    </>
  );
}
