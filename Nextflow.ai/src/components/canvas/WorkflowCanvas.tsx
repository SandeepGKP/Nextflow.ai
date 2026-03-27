"use client";

import React, { useCallback, useRef, useMemo, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  getOutgoers,
} from "reactflow";

// Local types to bypass broken library exports
interface Connection {
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
}
type NodeMouseHandler = (event: React.MouseEvent, node: any) => void;
import "reactflow/dist/style.css";
import { useWorkflowStore, AppNode } from "@/store/workflowStore";
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import LLMNode from "@/components/nodes/LLMNode";
import NodeContextMenu from "./NodeContextMenu";
import { Play, Save, Download, Upload, Workflow, FolderOpen, Plus, Loader2, Trash2 } from "lucide-react";

// Improved type-safe connection rules: source handle id → allowed target handle ids
const VALID_CONNECTIONS: Record<string, string[]> = {
  // text nodes output → LLM text inlets, or other text processors
  output: ["system_prompt", "user_message", "input", "video", "image"],
};

// Strict category-based validation
const HANDLE_TYPES: Record<string, string> = {
  system_prompt: "text",
  user_message: "text",
  images: "image",
  image: "image",
  video: "video",
  output: "any",
};

const NODE_LABEL_MAP: Record<string, string> = {
  text: "Text Node", uploadImage: "Upload Image", uploadVideo: "Upload Video",
  cropImage: "Crop Image", extractFrame: "Extract Frame", runLlm: "Run LLM",
};

const SAMPLE_WORKFLOW = {
  nodes: [
    { id: "text-1", type: "text", position: { x: 50, y: 50 }, data: { label: "Text Node #1 (System)", status: "idle", text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description." } },
    { id: "text-2", type: "text", position: { x: 50, y: 250 }, data: { label: "Text Node #2 (Details)", status: "idle", text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design." } },
    { id: "img-1", type: "uploadImage", position: { x: 50, y: 500 }, data: { label: "Upload Image", status: "idle" } },
    { id: "vid-1", type: "uploadVideo", position: { x: 50, y: 700 }, data: { label: "Upload Video", status: "idle" } },
    { id: "crop-1", type: "cropImage", position: { x: 350, y: 450 }, data: { label: "Crop Image", status: "idle", x: 0, y: 0, width: 100, height: 100 } },
    { id: "ext-1", type: "extractFrame", position: { x: 350, y: 700 }, data: { label: "Extract Frame", status: "idle", timestamp: "50%" } },
    { id: "llm-1", type: "runLlm", position: { x: 650, y: 150 }, data: { label: "Run LLM #1", status: "idle", model: "gemini-1.5-flash" } },
    { id: "text-3", type: "text", position: { x: 650, y: 550 }, data: { label: "Text Node #3 (Final System)", status: "idle", text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame." } },
    { id: "llm-2", type: "runLlm", position: { x: 950, y: 350 }, data: { label: "Run LLM #2 (Final)", status: "idle", model: "gemini-1.5-pro" } },
  ],
  edges: [
    { id: "e1", source: "img-1", sourceHandle: "output", target: "crop-1", targetHandle: "image", animated: true, style: { stroke: "#6366f1" } },
    { id: "e2", source: "vid-1", sourceHandle: "output", target: "ext-1", targetHandle: "video", animated: true, style: { stroke: "#6366f1" } },
    { id: "e3", source: "text-1", sourceHandle: "output", target: "llm-1", targetHandle: "system_prompt", animated: true, style: { stroke: "#6366f1" } },
    { id: "e4", source: "text-2", sourceHandle: "output", target: "llm-1", targetHandle: "user_message", animated: true, style: { stroke: "#6366f1" } },
    { id: "e6", source: "text-3", sourceHandle: "output", target: "llm-2", targetHandle: "system_prompt", animated: true, style: { stroke: "#6366f1" } },
    { id: "e7", source: "llm-1", sourceHandle: "output", target: "llm-2", targetHandle: "user_message", animated: true, style: { stroke: "#6366f1" } },
    { id: "e8", source: "crop-1", sourceHandle: "output", target: "llm-1", targetHandle: "images", animated: true, style: { stroke: "#6366f1" } },
    { id: "e9", source: "ext-1", sourceHandle: "output", target: "llm-2", targetHandle: "images", animated: true, style: { stroke: "#6366f1" } },
  ],
};

function CanvasInner() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    addNode, executeWorkflow, isExecuting, isSaving, saveWorkflow, exportWorkflow, importWorkflow, setNodes, setEdges,
    executeNode, currentWorkflowName, setCurrentWorkflow, loadWorkflow, deleteWorkflow, setDirty
  } = useWorkflowStore();

  const { undo, redo, clear } = useWorkflowStore.temporal.getState();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === "z";
      const isY = e.key.toLowerCase() === "y";
      const isShift = e.shiftKey;
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && isZ) {
        e.preventDefault();
        if (isShift) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrl && isY) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const isDirty = useWorkflowStore((s) => s.isDirty);

  // Unsaved changes browser warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger the "Leave site?" popup
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const { screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; top: number; left: number } | null>(null);

  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [isFetchingWorkflows, setIsFetchingWorkflows] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>([]);

  const fetchSavedWorkflows = async () => {
    setIsFetchingWorkflows(true);
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      if (data.workflows) setSavedWorkflows(data.workflows);
    } catch (e) {
      console.error("Failed to load workflows");
    } finally {
      setIsFetchingWorkflows(false);
    }
  };

  const nodeTypes = useMemo(() => ({
    text: TextNode, uploadImage: UploadImageNode, uploadVideo: UploadVideoNode,
    cropImage: CropImageNode, extractFrame: ExtractFrameNode, runLlm: LLMNode,
  }), []);

  const isValidConnection = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return false;

    // 1. DAG Validation: Prevent circularity
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;

    const checkCycle = (node: any, targetId: string): boolean => {
      const outgoers = getOutgoers(node as any, nodes as any, edges as any);
      for (const outgoer of outgoers) {
        if (outgoer.id === targetId) return true;
        if (checkCycle(outgoer, targetId)) return true;
      }
      return false;
    };

    if (checkCycle(targetNode, connection.source!)) {
      console.warn("Circular connection prevented");
      return false;
    }

    // 2. Type-Safe Connection Validation
    const sourceH = connection.sourceHandle || "output";
    const targetH = connection.targetHandle || "input";

    // Text nodes can connect to most things, but Image can't connect to System Prompt
    const sourceNodeObj = nodes.find(n => n.id === connection.source);
    const targetNodeObj = nodes.find(n => n.id === connection.target);

    if (sourceNodeObj?.type === "uploadImage" && (targetH === "system_prompt" || targetH === "user_message")) {
      return false;
    }
    if (sourceNodeObj?.type === "uploadVideo" && (targetH === "system_prompt" || targetH === "user_message" || targetH === "image")) {
      return false;
    }

    return true;
  }, [nodes, edges]);

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ nodeId: node.id, top: event.clientY, left: event.clientX });
  }, []);

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode({
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: NODE_LABEL_MAP[type] || type, status: "idle" },
    });
  }, [addNode, screenToFlowPosition]);

  const handleExport = () => {
    const blob = new Blob([exportWorkflow()], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${currentWorkflowName}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const handleImport = () => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json" });
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => { if (typeof re.target?.result === "string") importWorkflow(re.target.result); };
      reader.readAsText(file);
    };
    input.click();
  };

  const loadSampleWorkflow = () => {
    setNodes(SAMPLE_WORKFLOW.nodes as any);
    setEdges(SAMPLE_WORKFLOW.edges as any);
    setCurrentWorkflow(null, "Product Marketing Kit");
  };

  const handleNewProject = () => {
    setNodes([]);
    setEdges([]);
    setCurrentWorkflow(null, "Untitled Workflow");
    setDirty(false);
  };

  return (
    <div className="w-full h-full flex-grow relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        proOptions={{ hideAttribution: true }}
        fitView
        deleteKeyCode="Delete"
        className="bg-transparent"
      >
        <Background color="#3f3f46" gap={24} size={1} />
        <Controls className="!bottom-4 !left-4" />
        <MiniMap
          nodeColor={(n: AppNode) => ({
            running: "#3b82f6", success: "#22c55e", error: "#ef4444",
          }[n.data?.status as string] || "#52525b")}
          maskColor="rgba(0,0,0,0.7)"
          className="!bottom-4 !right-4 !bg-zinc-900 !border-zinc-800 rounded-lg"
        />
        {/* Top toolbar */}
        <Panel position="top-center" className="flex items-center gap-2 flex-wrap bg-zinc-950/80 p-1.5 rounded-lg border border-zinc-800 shadow-xl backdrop-blur-md">
          <input
            type="text"
            value={currentWorkflowName}
            onChange={(e) => setCurrentWorkflow(useWorkflowStore.getState().currentWorkflowId, e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 w-40 hover:bg-zinc-800 transition"
          />
          <button
            onClick={() => saveWorkflow(currentWorkflowName)}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded-md text-xs transition border border-zinc-700"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? "Saving..." : "Save"}
          </button>

          <div className="relative">
            <button
              onClick={() => {
                if (!showLoadMenu) fetchSavedWorkflows();
                setShowLoadMenu(!showLoadMenu);
              }}
              disabled={isFetchingWorkflows}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded-md text-xs transition border border-zinc-700"
            >
              {isFetchingWorkflows ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderOpen className="w-3.5 h-3.5" />
              )}
              {isFetchingWorkflows ? "Fetching..." : "Load"}
            </button>
            {showLoadMenu && (
              <div className="absolute top-10 left-0 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-64 overflow-y-auto custom-scrollbar-premium">
                {savedWorkflows.length === 0 ? (
                  <div className="p-3 text-xs text-zinc-500 text-center">No saved workflows found.</div>
                ) : (
                  savedWorkflows.map(wf => (
                    <div key={wf.id} className="group flex items-center border-b border-zinc-800 last:border-0 hover:bg-zinc-800 transition">
                      <button
                        onClick={() => {
                          loadWorkflow(wf.id);
                          setShowLoadMenu(false);
                        }}
                        className="flex-grow text-left px-3 py-2 text-xs text-zinc-300 group-hover:text-white transition truncate"
                      >
                        {wf.name}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this workflow?")) {
                            await deleteWorkflow(wf.id);
                            fetchSavedWorkflows(); // Refresh list
                          }
                        }}
                        className="p-2 text-zinc-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button onClick={handleNewProject} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs transition border border-zinc-700">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs transition border border-zinc-700">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={handleImport} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs transition border border-zinc-700">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button onClick={loadSampleWorkflow} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-purple-300 px-3 py-1.5 rounded-md text-xs transition border border-purple-800/60">
            <Workflow className="w-3.5 h-3.5" /> Sample Workflow
          </button>
          <button
            onClick={() => {
              const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
              if (selectedIds.length === 1) {
                executeNode(selectedIds[0]);
              } else {
                executeWorkflow(selectedIds);
              }
            }}
            disabled={isExecuting || nodes.length === 0}
            className="flex items-center cursor-pointer gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-xs font-semibold transition shadow-lg shadow-indigo-500/20"
          >
            <Play className="w-3.5 h-3.5 " />
            {isExecuting ? "Running…" : (nodes.some(n => n.selected) ? "Run Selection" : "Run Workflow")}
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1" />

          <div className="flex bg-zinc-900 border border-zinc-700 rounded-md p-0.5">
            <button
              onClick={() => undo()}
              className="p-1 px-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition text-[10px] font-bold uppercase tracking-tighter"
            >
              Undo
            </button>
            <button
              onClick={() => redo()}
              className="p-1 px-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition text-[10px] font-bold uppercase tracking-tighter"
            >
              Redo
            </button>
          </div>
        </Panel>

        {/* Empty-state helper */}
        {nodes.length === 0 && (
          <Panel position="top-left" className="pointer-events-none">
            <div className="mt-20 ml-4 text-zinc-600 text-sm space-y-1">
              <p>← Drag a node from the sidebar to start</p>
              <p>or click <span className="text-purple-400">Sample Workflow</span> above</p>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <NodeContextMenu
          nodeId={contextMenu.nodeId}
          top={contextMenu.top}
          left={contextMenu.left}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function WorkflowCanvas() {
  return <ReactFlowProvider><CanvasInner /></ReactFlowProvider>;
}
