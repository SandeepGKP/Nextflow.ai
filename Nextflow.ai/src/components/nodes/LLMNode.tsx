"use client";

import React, { useState } from "react";
import { Handle } from "reactflow";
import BaseNode from "./BaseNode";
import { useWorkflowStore, BaseNodeData } from "@/store/workflowStore";
import { Maximize2, Minimize2, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const MODELS = [
  { value: "gemini-1.5-flash",    label: "Gemini 1.5 Flash" },
  { value: "gemini-2.0-flash",    label: "Gemini 2.0 Flash" },
  { value: "gemini-flash-latest", label: "Gemini Flash (Latest)" },
  { value: "gemini-pro-latest",   label: "Gemini Pro (Latest)" },
];

const HANDLE_LABELS = [
  { id: "system_prompt", label: "System", color: "!bg-zinc-600" },
  { id: "user_message",  label: "User",   color: "!bg-indigo-500" },
  { id: "images",        label: "Images", color: "!bg-emerald-500" },
];

export default function LLMNode({ id, data, selected }: { id: string; data: BaseNodeData; selected?: boolean }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data.output) return;
    navigator.clipboard.writeText(data.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUserConnected = edges.some((e) => e.target === id && e.targetHandle === "user_message");
  const isSystemConnected = edges.some((e) => e.target === id && e.targetHandle === "system_prompt");

  return (
    <BaseNode id={id} nodeType="runLlm" data={data} selected={selected}>
      {/* Labelled input handles */}
      <div className="absolute left-0 top-10 flex flex-col" style={{ gap: 20, transform: "translateX(-8px)" }}>
        {HANDLE_LABELS.map((h, i) => (
          <div key={h.id} className="relative flex items-center">
            <Handle
              type="target"
              position="left"
              id={h.id}
              className={`!w-3 !h-3 ${h.color} !border-2 !border-zinc-900 !relative !transform-none`}
            />
            <span className="ml-2 text-[9px] text-zinc-500 leading-none">{h.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pl-12 h-full flex-grow">
        {/* Model selector */}
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Model</label>
          <select
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
            value={data.model || "gemini-1.5-flash"}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
          >
            {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Manual system prompt (greyed when connected) */}
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">System Prompt (manual)</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none placeholder:text-zinc-600"
            rows={2}
            placeholder={isSystemConnected ? "Connected to input..." : "Instructions for AI..."}
            value={data.systemPrompt || ""}
            disabled={isSystemConnected}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          />
        </div>

        {/* Manual user message (greyed when connected) */}
        <div className="flex flex-col gap-1 shrink-0">
          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">User Message (manual)</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none placeholder:text-zinc-600"
            rows={2}
            placeholder={isUserConnected ? "Connected to input..." : "Or connect a Text Node above..."}
            value={data.userMessage || ""}
            disabled={isUserConnected}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
          />
        </div>

        {/* Inline response */}
        {data.output && (
          <div className="flex flex-col gap-1 group relative flex-grow h-full min-h-[144px]">
            <div className="flex items-center justify-between pr-1 shrink-0">
              <label className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Response</label>
              <div className="flex gap-1">
                <button
                  onClick={handleCopy}
                  title="Copy Response"
                  className="opacity-0 group-hover:opacity-100 bg-zinc-900/80 text-white rounded-md p-1 hover:bg-zinc-800 border border-zinc-700 transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setIsExpanded(true)}
                  title="Expand Response"
                  className="opacity-0 group-hover:opacity-100 bg-zinc-900/80 text-white rounded-md p-1 hover:bg-zinc-800 border border-zinc-700 transition"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="w-full flex-grow bg-zinc-950/60 border border-emerald-800/40 rounded-lg p-2 text-[13px] text-zinc-300 overflow-y-auto shadow-inner custom-scrollbar-premium">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold text-zinc-100 my-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-md font-bold text-zinc-100 my-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold text-zinc-200 my-1" {...props} />,
                  p: ({node, ...props}) => <p className="my-1.5 leading-relaxed" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-emerald-400" {...props} />,
                  em: ({node, ...props}) => <em className="italic text-zinc-200" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 my-1.5" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-1.5" {...props} />,
                  li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-emerald-500/50 pl-3 my-2 text-zinc-400 italic" {...props} />,
                  code: ({node, inlineClassName, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inlineClassName && match ? (
                      <pre className="bg-zinc-900 border border-zinc-700 rounded p-2 my-2 overflow-x-auto text-xs text-emerald-400">
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    ) : (
                      <code className="bg-zinc-800/80 text-emerald-300 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
                    );
                  }
                }}
              >
                {data.output}
              </ReactMarkdown>
            </div>

            {/* Full Screen Overlay Reader */}
            {isExpanded && (
              <div 
                className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 lg:p-2 cursor-default "
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              >
                <div 
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-full flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-1 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 w-full h-full">
                    <h3 className="text-zinc-400 font-semibold text-xs uppercase tracking-widest">AI Response Reader</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        title="Copy Response"
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-full flex items-center gap-2 transition text-sm font-medium shadow-lg border border-zinc-600"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full flex items-center gap-2 transition text-sm font-medium shadow-lg shadow-emerald-500/20"
                      >
                        <Minimize2 className="w-4 h-4" />
                        Collapse
                      </button>
                    </div>
                  </div>
                  <div className="p-8 lg:p-12 overflow-y-auto custom-scrollbar-premium">
                    <div className="text-zinc-100 text-base lg:text-lg leading-relaxed font-sans pb-10">
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-white mb-6 mt-4 border-b border-zinc-800 pb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-white mb-4 mt-6" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xl font-bold text-zinc-200 mb-3 mt-5" {...props} />,
                          p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-emerald-400" {...props} />,
                          em: ({node, ...props}) => <em className="italic text-zinc-200" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-8 mb-4 space-y-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-8 mb-4 space-y-2" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-1 my-4 bg-zinc-800/30 text-zinc-300 italic rounded-r-lg" {...props} />,
                          code: ({node, inlineClassName, className, children, ...props}: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inlineClassName && match ? (
                              <pre className="bg-[#0d1117] border border-zinc-800 rounded-xl p-4 my-6 overflow-x-auto text-sm text-emerald-400 font-mono shadow-xl relative group">
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            ) : (
                              <code className="bg-zinc-800/80 text-emerald-400 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>{children}</code>
                            );
                          }
                        }}
                      >
                        {data.output}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position="right" id="output"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-zinc-900" />
    </BaseNode>
  );
}
