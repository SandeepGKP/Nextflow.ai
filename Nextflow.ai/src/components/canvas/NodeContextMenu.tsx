"use client";

import React, { useEffect, useRef } from "react";
import { Play, Trash2, Copy, X } from "lucide-react";
import { useWorkflowStore, AppNode } from "@/store/workflowStore";
import { useReactFlow } from "reactflow";

interface NodeContextMenuProps {
  nodeId: string;
  top: number;
  left: number;
  onClose: () => void;
}

export default function NodeContextMenu({ nodeId, top, left, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { executeNode, nodes, addNode } = useWorkflowStore();
  const { deleteElements } = useReactFlow();
  const node = nodes.find((n: AppNode) => n.id === nodeId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleRunNode = async () => {
    onClose();
    await executeNode(nodeId);
  };

  const handleDelete = () => {
    deleteElements({ nodes: [{ id: nodeId }] });
    onClose();
  };

  const handleDuplicate = () => {
    if (!node) return;
    const newNode = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
    };
    addNode(newNode);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="fixed z-50 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider truncate">
          {node?.data?.label || "Node"}
        </span>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="py-1">
        <button
          onClick={handleRunNode}
          className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm text-zinc-300 hover:bg-indigo-600/30 hover:text-indigo-300 transition"
        >
          <Play className="w-3.5 h-3.5" />
          Run this node
        </button>
        <button
          onClick={handleDuplicate}
          className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition"
        >
          <Copy className="w-3.5 h-3.5" />
          Duplicate
        </button>
        <div className="border-t border-zinc-800 my-1" />
        <button
          onClick={handleDelete}
          className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm text-red-400 hover:bg-red-600/20 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
