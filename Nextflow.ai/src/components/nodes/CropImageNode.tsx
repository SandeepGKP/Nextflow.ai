"use client";

import React, { useState } from "react";
import { Handle } from "reactflow";

enum Position {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom",
}
import BaseNode from "./BaseNode";
import { useWorkflowStore, BaseNodeData } from "@/store/workflowStore";
import { Maximize2, Minimize2 } from "lucide-react";

export default function CropImageNode({ id, data, selected }: { id: string; data: BaseNodeData; selected?: boolean }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const [isExpanded, setIsExpanded] = useState(false);

  const field = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateNodeData(id, { [key]: Number(e.target.value) });

  const edges = useWorkflowStore((s) => s.edges);

  return (
    <BaseNode id={id} nodeType="cropImage" data={data} selected={selected}>
      <div className="absolute left-0 top-10 flex flex-col" style={{ gap: 20, transform: "translateX(-8px)" }}>
        <div className="relative flex items-center">
          <Handle type="target" position={Position.Left} id="image"
            className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 !relative !transform-none" />
          <span className="ml-2 text-[9px] text-zinc-500 leading-none">Image</span>
        </div>
        {(["x","y","width","height"] as const).map((h) => (
          <div key={h} className="relative flex items-center">
            <Handle type="target" position={Position.Left} id={h}
              className="!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-900 !relative !transform-none" />
            <span className="ml-2 text-[9px] text-zinc-500 leading-none capitalize">{h}</span>
          </div>
        ))}
      </div>

      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Crop Region (%)</label>

      <div className="grid grid-cols-2 gap-2">
        {(["x","y","width","height"] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-600 capitalize">{k}</span>
            <input
              type="number" min={0} max={100}
              className="w-full bg-zinc-950 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md p-1.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
              placeholder={k === "width" || k === "height" ? "100" : "0"}
              value={data[k] ?? ""}
              disabled={useWorkflowStore.getState().edges.some(e => e.target === id && e.targetHandle === k)}
              onChange={field(k)}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Output Preview</label>
        <div className="relative w-full h-28 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950/50 group flex items-center justify-center">
          {data.croppedUrl && data.croppedUrl !== "undefined" ? (
            <>
              <img src={data.croppedUrl} alt="Cropped" className="object-contain w-full h-full bg-black/20" />
              <button
                onClick={() => setIsExpanded(true)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-zinc-900/90 text-white rounded-md p-1.5 hover:bg-zinc-800 border border-zinc-700 transition backdrop-blur-md"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              
              {isExpanded && (
                <div 
                  className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-10 cursor-default"
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                >
                  <div className="relative max-w-5xl max-h-full">
                    <img src={data.croppedUrl} alt="Full preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-zinc-800 object-contain" />
                    <button onClick={() => setIsExpanded(false)} className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 transition backdrop-blur-sm border border-white/20">
                      <Minimize2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Collapse</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <span className="text-[10px] text-zinc-600 italic tracking-tight">Waiting for run...</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-zinc-900" />
    </BaseNode>
  );
}
