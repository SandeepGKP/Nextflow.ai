"use client";

import React, { useState } from "react";
import { useWorkflowStore, WorkflowState, WorkflowRun, NodeRunEntry } from "@/store/workflowStore";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Trash2, Eraser } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const statusColor: Record<string, string> = {
  success: "text-emerald-400",
  error: "text-red-400",
  running: "text-blue-400 animate-pulse",
  idle: "text-zinc-500",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "success") return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === "error") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  return <Clock className="w-3.5 h-3.5 text-blue-400" />;
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function HistoryPanel() {
  const history = useWorkflowStore((s: WorkflowState) => s.history);
  const fetchHistory = useWorkflowStore((s: WorkflowState) => s.fetchHistory);
  const [expanded, setExpanded] = useState<string | null>(null);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <aside className="w-80 border-l border-zinc-800 bg-zinc-900/50 flex flex-col z-20">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="font-medium text-white text-sm">Workflow History</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">{history.length} run{history.length !== 1 ? "s" : ""}</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => { if(confirm("Clear all history?")) useWorkflowStore.getState().clearHistory(); }}
            className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-md transition"
            title="Clear All"
          >
            <Eraser className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm gap-2">
            <Clock className="w-8 h-8 opacity-40" />
            <p>No runs yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {history.map((run: WorkflowRun) => {
              const duration = run.finishedAt ? run.finishedAt - run.startedAt : 0;
              const isExpanded = expanded === run.id;
              return (
                <div key={run.id} className="px-4 py-3 hover:bg-zinc-800/40 transition cursor-pointer" onClick={() => setExpanded(isExpanded ? null : run.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={run.status} />
                      <span className="text-xs font-medium text-zinc-300 capitalize">{run.scope} run</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-zinc-500">{formatDuration(duration)}</span>
                       <button
                         onClick={(e) => { e.stopPropagation(); useWorkflowStore.getState().deleteHistoryItem(run.id); }}
                         className="p-1 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 rounded transition"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                       {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
                     </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">{formatTime(run.startedAt)}</p>
                  
                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {run.nodeRuns.map((nr: NodeRunEntry, idx: number) => {
                        const isLast = idx === run.nodeRuns.length - 1;
                        return (
                          <div key={nr.nodeId} className="relative pl-2 text-[11px]">
                            {/* Node Line Header */}
                            <div className="flex items-center gap-1.5 py-1">
                              <span className="text-zinc-500 font-mono tracking-tighter">┣━</span>
                              <span className="text-zinc-300 font-medium truncate max-w-[140px]">{nr.nodeType.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <StatusIcon status={nr.status} />
                              <span className="text-zinc-600 ml-auto whitespace-nowrap">{nr.finishedAt ? formatDuration(nr.finishedAt - nr.startedAt) : "—"}</span>
                            </div>

                            {/* Node Output Details */}
                            <div className="flex items-start gap-1 pb-1">
                              <span className="text-zinc-600 font-mono ml-4">┃ ┗━━</span>
                              <div className="flex-1 bg-zinc-950/40 border border-zinc-800/40 rounded px-1.5 py-1 min-h-[22px]">
                                {nr.status === "error" ? (
                                  <span className="text-red-400/80 italic text-[10px]">Error: Task failed or timed out</span>
                                ) : nr.outputs?.output ? (
                                  <div className="text-zinc-400 line-clamp-6 leading-tight max-w-none pb-1 font-sans">
                                    <ReactMarkdown
                                      components={{
                                        h1: ({node, ...props}) => <h1 className="text-sm font-bold text-white my-1" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-xs font-bold text-white my-1" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-xs font-bold text-zinc-200 my-0.5" {...props} />,
                                        p: ({node, ...props}) => <p className="my-1" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-bold text-emerald-400" {...props} />,
                                        em: ({node, ...props}) => <em className="italic text-zinc-200" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 my-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-1" {...props} />,
                                        li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                                        blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-emerald-500/50 pl-2 my-1 text-zinc-500 italic" {...props} />,
                                        code: ({node, inlineClassName, className, children, ...props}: any) => {
                                          const match = /language-(\w+)/.exec(className || '');
                                          return !inlineClassName && match ? (
                                            <pre className="bg-zinc-900 border border-zinc-700 rounded p-1 my-1 overflow-x-auto text-[10px] text-emerald-400">
                                              <code className={className} {...props}>{children}</code>
                                            </pre>
                                          ) : (
                                            <code className="bg-zinc-800 text-emerald-400 px-1 rounded text-[10px]" {...props}>{children}</code>
                                          );
                                        }
                                      }}
                                    >
                                      {nr.outputs.output}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <span className="text-zinc-600 italic">No output captured</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
