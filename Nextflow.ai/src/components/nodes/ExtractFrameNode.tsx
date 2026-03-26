"use client";

import React from "react";
import { Handle } from "reactflow";

enum Position {
  Left = "left",
  Right = "right",
  Top = "top",
  Bottom = "bottom",
}
import BaseNode from "./BaseNode";
import { useWorkflowStore, BaseNodeData } from "@/store/workflowStore";

export default function ExtractFrameNode({ id, data, selected }: { id: string; data: BaseNodeData; selected?: boolean }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const edges = useWorkflowStore((s) => s.edges);
  const isTimeConnected = edges.some((e) => e.target === id && e.targetHandle === "timestamp");

  return (
    <BaseNode id={id} nodeType="extractFrame" data={data} selected={selected}>
      <div className="absolute left-0 top-10 flex flex-col" style={{ gap: 20, transform: "translateX(-8px)" }}>
        <div className="relative flex items-center">
          <Handle type="target" position={Position.Left} id="video"
            className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 !relative !transform-none" />
          <span className="ml-2 text-[9px] text-zinc-500 leading-none">Video</span>
        </div>
        <div className="relative flex items-center">
          <Handle type="target" position={Position.Left} id="timestamp"
            className="!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-900 !relative !transform-none" />
          <span className="ml-2 text-[9px] text-zinc-500 leading-none">Time</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 pl-12">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Timestamp</label>
        <input
          type="text"
          className="w-full bg-zinc-950 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
          placeholder={isTimeConnected ? "Connected..." : "e.g. 00:15 or 50%"}
          value={data.timestamp || ""}
          disabled={isTimeConnected}
          onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Output Preview</label>
        <div className="w-full h-28 aspect-video rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950/50 flex items-center justify-center">
          {data.frameUrl && data.frameUrl !== "undefined" ? (
            <img src={data.frameUrl} alt="Extracted frame" className="object-contain w-full h-full bg-black/20" />
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
