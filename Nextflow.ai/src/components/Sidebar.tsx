"use client";

import React, { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Search, Type, Image, Video, Crop, Film, Cpu, ChevronLeft, ChevronRight } from "lucide-react";

const NODE_TYPES = [
  { type: "text",         label: "Text Node",          icon: Type,   description: "Add text input or prompts" },
  { type: "uploadImage",  label: "Upload Image",        icon: Image,  description: "Upload via Transloadit" },
  { type: "cropImage",    label: "Crop Image",          icon: Crop,   description: "FFmpeg crop via Trigger.dev" },
  { type: "uploadVideo",  label: "Upload Video",        icon: Video,  description: "Upload via Transloadit" },
  { type: "extractFrame", label: "Extract Frame",       icon: Film,   description: "FFmpeg frame extraction" },
  { type: "runLlm",       label: "Run Any LLM",         icon: Cpu,    description: "Gemini multimodal AI" },
];

export default function Sidebar() {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const filtered = NODE_TYPES.filter(
    (n) => n.label.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      className={`${collapsed ? "w-14" : "w-64"} border-r border-zinc-800 bg-zinc-900/60 backdrop-blur-md flex flex-col z-20 transition-all duration-300 relative`}
    >
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between min-h-[56px]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white text-sm tracking-wide">NextFlow</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {!collapsed && <UserButton />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-500 hover:text-zinc-200 transition p-1 rounded"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Access</p>
        )}
        <div className="space-y-1.5">
          {filtered.map(({ type, label, icon: Icon, description }) => (
            <div
              key={type}
              className={`${collapsed ? "justify-center p-2" : "px-3 py-2.5"} flex items-center gap-3 bg-zinc-800/40 rounded-lg cursor-grab hover:bg-zinc-800 hover:border-zinc-600 transition active:cursor-grabbing border border-zinc-700/40 group`}
              draggable
              onDragStart={(e) => onDragStart(e, type)}
              title={collapsed ? label : ""}
            >
              <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{label}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
