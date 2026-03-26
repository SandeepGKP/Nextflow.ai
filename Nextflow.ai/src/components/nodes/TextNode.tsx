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

export default function TextNode({ id, data, selected }: { id: string; data: BaseNodeData; selected?: boolean }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  return (
    <BaseNode id={id} nodeType="text" data={data} selected={selected}>
      <Handle type="target" position={Position.Left} id="input"
        className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900" />

      <div className="flex flex-col gap-1 h-full">
        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Text Output</label>
        <textarea
          className="w-full flex-grow bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none placeholder:text-zinc-600 custom-scrollbar-premium min-h-[80px]"
          placeholder="Enter text or prompt…"
          value={data.text || ""}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>

      <Handle type="source" position={Position.Right} id="output"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-zinc-900" />
    </BaseNode>
  );
}
