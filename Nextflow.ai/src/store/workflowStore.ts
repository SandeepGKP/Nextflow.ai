import { create } from "zustand";

// ─── Local type shims (reactflow's .d.ts is broken under this TS config) ──────
export type RFPosition = { x: number; y: number };

export type Connection = {
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  style?: any;
  markerEnd?: any;
  [key: string]: any;
};



export type Node<T = any> = {
  id: string;
  type?: string;
  position: RFPosition;
  data: T;
  selected?: boolean;
  [key: string]: any;
};

export type NodeChange = any;
export type EdgeChange = any;

export type OnNodesChange = (changes: any[]) => void;
export type OnEdgesChange = (changes: any[]) => void;
export type OnConnect   = (connection: Connection) => void;

// Runtime helpers from reactflow (exist at JS level even when .d.ts is broken)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rf = require("reactflow") as {
  addEdge: (edge: (Omit<Partial<Edge>, "source" | "target"> & Connection) & Record<string, unknown>, edges: Edge[]) => Edge[];
  applyNodeChanges: (changes: NodeChange[], nodes: Node<any>[]) => Node<any>[];
  applyEdgeChanges: (changes: EdgeChange[], edges: Edge[]) => Edge[];
  MarkerType: { ArrowClosed: string };
};

const addEdge          = rf.addEdge;
const applyNodeChanges = rf.applyNodeChanges;
const applyEdgeChanges = rf.applyEdgeChanges;
const MarkerType       = rf.MarkerType;

export type NodeStatus = "idle" | "running" | "success" | "error";

export type BaseNodeData = {
  label: string;
  status: NodeStatus;
  [key: string]: any;
};

export type AppNode = Node<BaseNodeData>;

export type WorkflowRun = {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: NodeStatus;
  scope: "full" | "single" | "selected";
  nodeRuns: NodeRunEntry[];
};

export type NodeRunEntry = {
  nodeId: string;
  nodeType: string;
  status: NodeStatus;
  startedAt: number;
  finishedAt?: number;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
};

export interface WorkflowState {
  nodes: AppNode[];
  edges: Edge[];
  history: WorkflowRun[];
  isExecuting: boolean;
  isSaving: boolean;
  currentWorkflowId: string | null;
  currentWorkflowName: string;
  setCurrentWorkflow: (id: string | null, name: string) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: AppNode) => void;
  updateNodeData: (id: string, data: Partial<BaseNodeData>) => void;
  executeWorkflow: (selectedNodeIds?: string[]) => Promise<void>;
  executeNode: (nodeId: string) => Promise<void>;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflow: (workflowId: string) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  addHistoryRun: (run: WorkflowRun) => void;
  fetchHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

// Topological sort (Kahn's algorithm) for DAG
function topologicalSort(nodes: AppNode[], edges: Edge[]): AppNode[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0);
  const result: AppNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of adj.get(node.id) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(nodes.find((n) => n.id === neighbor)!);
      }
    }
  }
  return result;
}

// Gather inputs for a node from connected edges and resolved results
function gatherInputs(nodeId: string, edges: Edge[], results: Record<string, any>, nodes: AppNode[]): Record<string, any> {
  const incoming = edges.filter((e) => e.target === nodeId);
  const inputs: Record<string, any> = {};
  for (const edge of incoming) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    // Fallback to source node's stored data if not in current results (e.g. single node run)
    const sourceResult = results[edge.source] ?? sourceNode?.data.output ?? sourceNode?.data.imageUrl ?? sourceNode?.data.videoUrl ?? sourceNode?.data.croppedUrl ?? sourceNode?.data.frameUrl;
    
    if (sourceResult !== undefined && sourceResult !== null) {
      const targetHandle = edge.targetHandle || "input";
      // Accumulate into array for multi-input handles
      if (targetHandle === "images" || targetHandle === "input_list") {
        inputs[targetHandle] = Array.isArray(inputs[targetHandle]) ? [...inputs[targetHandle], sourceResult] : [sourceResult];
      } else {
        inputs[targetHandle] = sourceResult;
      }
    }
  }
  return inputs;
}

async function executeNodeFn(node: AppNode, inputs: Record<string, any>): Promise<any> {
  switch (node.type) {
    case "text":
      return { output: node.data.text || "" };

    case "uploadImage":
      return { imageUrl: node.data.imageUrl || null };

    case "uploadVideo":
      return { videoUrl: node.data.videoUrl || null };

    case "cropImage": {
      const imageUrl = inputs.image || node.data.imageUrl;
      if (!imageUrl) return { error: "No image source found" };
      const x = inputs.x ?? node.data.x ?? 0;
      const y = inputs.y ?? node.data.y ?? 0;
      const width = inputs.width ?? node.data.width ?? 100;
      const height = inputs.height ?? node.data.height ?? 100;

      const res = await fetch("/api/execute/crop", {
        method: "POST",
        body: JSON.stringify({ imageUrl, x, y, width, height, nodeId: node.id, workflowRunId: inputs.workflowRunId }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.error === "object" ? JSON.stringify(data.error) : (data.error || "Crop failed");
        return { error: errMsg };
      }
      return { croppedUrl: data.croppedUrl, imageUrl: data.croppedUrl };
    }

    case "extractFrame": {
      const videoUrl = inputs.video || node.data.videoUrl;
      if (!videoUrl) return { error: "No video source found" };
      const timestamp = inputs.timestamp ?? node.data.timestamp ?? "0";

      const res = await fetch("/api/execute/extract-frame", {
        method: "POST",
        body: JSON.stringify({ videoUrl, timestamp, nodeId: node.id, workflowRunId: inputs.workflowRunId }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.error === "object" ? JSON.stringify(data.error) : (data.error || "Extract frame failed");
        return { error: errMsg };
      }
      return { frameUrl: data.frameUrl };
    }

    case "runLlm": {
      const userMessage = inputs.user_message || node.data.userMessage || "";
      const systemPrompt = inputs.system_prompt || node.data.systemPrompt;
      let rawImages = inputs.images || [];
      if (!Array.isArray(rawImages)) rawImages = [rawImages];
      
      // Sanitization: Ensure only strings (URLs/Base64) reach the API
      const images: string[] = rawImages.filter((img: any) => typeof img === "string" && img.length > 0);

      // Add a small retry loop for 429s
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        const res = await fetch("/api/execute/llm", {
          method: "POST",
          body: JSON.stringify({ 
            model: node.data.model || "gemini-1.5-flash", 
            systemPrompt, 
            userMessage: userMessage || (images.length > 0 ? "Please analyze the provided input." : "Hello!"), 
            imageBase64s: images, 
            nodeId: node.id, 
            workflowRunId: inputs.workflowRunId 
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (res.status === 429) {
          attempts++;
          await new Promise(r => setTimeout(r, 2000 * attempts)); // Exponential backoff
          continue;
        }

        const data = await res.json();
        if (!res.ok) {
          const errMsg = typeof data.error === "object" ? JSON.stringify(data.error) : (data.error || "LLM failed");
          return { error: errMsg, output: errMsg };
        }
        return { output: data.output };
      }
      return { error: "Quota exceeded after multiple retries", output: "Quota exceeded" };
    }

    default:
      return null;
  }
}

import { temporal } from "zundo";

export const useWorkflowStore = create<WorkflowState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      history: [],
      isExecuting: false,
      isSaving: false,
      currentWorkflowId: null,
      currentWorkflowName: "My Workflow",

  setCurrentWorkflow: (id, name) => set({ currentWorkflowId: id, currentWorkflowName: name }),
  
  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        { ...connection, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" }, style: { stroke: "#6366f1" } },
        get().edges
      ),
    });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (node) => set({ nodes: [...get().nodes, node] }),
  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },
  addHistoryRun: (run) => set({ history: [run, ...get().history] }),

  executeWorkflow: async (selectedNodeIds?: string[]) => {
    const { nodes: allNodes, edges, updateNodeData, addHistoryRun } = get();
    if (get().isExecuting) return;
    
    // Determine scope
    let nodes = allNodes;
    let scope: "full" | "selected" = "full";
    if (selectedNodeIds && selectedNodeIds.length > 0) {
      nodes = allNodes.filter(n => selectedNodeIds.includes(n.id));
      scope = "selected";
    }

    set({ isExecuting: true });

    let dbRunId: string | null = null;
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        body: JSON.stringify({ scope }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      dbRunId = data.runId;
    } catch (e) {
      console.warn("Failed to create DB run, continuing in-memory", e);
    }

    const runId = dbRunId || `run-${Date.now()}`;
    const startedAt = Date.now();
    const nodeRuns: NodeRunEntry[] = [];
    const results: Record<string, any> = {};
    let runStatus: NodeStatus = "success";

    const inDegrees = new Map(nodes.map((n) => [n.id, edges.filter((e) => e.target === n.id && nodes.some(x => x.id === e.source)).length]));
    const outEdgesMap = new Map(nodes.map((n) => [n.id, edges.filter((e) => e.source === n.id)]));
    
    nodes.forEach((n) => updateNodeData(n.id, { status: "idle" }));

    async function processNode(nodeId: string): Promise<void> {
      const { nodes, edges } = get();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const inputs = gatherInputs(nodeId, edges, results, nodes);
      const nodeStartedAt = Date.now();
      updateNodeData(nodeId, { status: "running" });

      try {
        const result = await executeNodeFn(node, { ...inputs, workflowRunId: dbRunId });
        // results dictionary expects the primary output (for runLlm it's output, for others it's the URL)
        results[nodeId] = result?.output || result?.croppedUrl || result?.frameUrl || result;
        
        // Update local node state with the entire result object for visual preview
        updateNodeData(nodeId, { status: "success", ...result });
        
        nodeRuns.push({ 
          nodeId, 
          nodeType: node.type || "unknown", 
          status: "success", 
          startedAt: nodeStartedAt, 
          finishedAt: Date.now(), 
          inputs, 
          outputs: result 
        });
      } catch (err) {
        runStatus = "error";
        updateNodeData(nodeId, { status: "error" });
        nodeRuns.push({ nodeId, nodeType: node.type || "unknown", status: "error", startedAt: nodeStartedAt, finishedAt: Date.now(), inputs });
      }

      // Trigger dependents
      const dependents = outEdgesMap.get(nodeId) || [];
      const nextToRun: Promise<void>[] = [];
      for (const edge of dependents) {
        const targetId = edge.target;
        if (!inDegrees.has(targetId)) continue; // Not part of the selection

        const remaining = (inDegrees.get(targetId) || 1) - 1;
        inDegrees.set(targetId, remaining);
        if (remaining === 0) {
          nextToRun.push(processNode(targetId));
        }
      }
      if (nextToRun.length > 0) await Promise.all(nextToRun);
    }

    // Start with entry nodes
    const entryNodes = nodes.filter((n) => inDegrees.get(n.id) === 0);
    await Promise.all(entryNodes.map((n) => processNode(n.id)));

    if (dbRunId) {
      await fetch("/api/run", {
        method: "PATCH",
        body: JSON.stringify({ runId: dbRunId, status: runStatus, duration: Date.now() - startedAt }),
        headers: { "Content-Type": "application/json" },
      });
    }

    addHistoryRun({ id: runId, startedAt, finishedAt: Date.now(), status: runStatus, scope, nodeRuns });
    set({ isExecuting: false });
  },

  executeNode: async (nodeId: string) => {
    const { nodes, edges, updateNodeData, addHistoryRun } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const results: Record<string, any> = {};
    const inputs = gatherInputs(nodeId, edges, results, nodes);
    const startedAt = Date.now();
    updateNodeData(nodeId, { status: "running" });

    try {
      const result = await executeNodeFn(node, inputs);
      
      // Update local node state with the entire result object
      updateNodeData(nodeId, { status: "success", ...result });

      addHistoryRun({
        id: `run-${Date.now()}`,
        startedAt,
        finishedAt: Date.now(),
        status: "success",
        scope: "single",
        nodeRuns: [{ 
          nodeId, 
          nodeType: node.type || "unknown", 
          status: "success", 
          startedAt, 
          finishedAt: Date.now(), 
          inputs, 
          outputs: result 
        }],
      });
    } catch (err) {
      updateNodeData(nodeId, { status: "error" });
    }
  },

  saveWorkflow: async (name: string) => {
    const { nodes, edges, currentWorkflowId } = get();
    set({ isSaving: true });
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        body: JSON.stringify({ name, nodes, edges, workflowId: currentWorkflowId }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workflow?.id) {
          set({ currentWorkflowId: data.workflow.id, currentWorkflowName: data.workflow.name });
        }
      }
    } finally {
      set({ isSaving: false });
    }
  },

  loadWorkflow: async (workflowId: string) => {
    const res = await fetch(`/api/workflows?id=${workflowId}`);
    const data = await res.json();
    if (data.workflows?.[0]) {
      const wf = data.workflows[0];
      set({ 
        nodes: wf.json.nodes, 
        edges: wf.json.edges,
        currentWorkflowId: wf.id,
        currentWorkflowName: wf.name
      });
    }
  },

  deleteWorkflow: async (workflowId: string) => {
    const res = await fetch(`/api/workflows?id=${workflowId}`, { method: "DELETE" });
    if (res.ok) {
      if (get().currentWorkflowId === workflowId) {
        set({ currentWorkflowId: null, currentWorkflowName: "My Workflow" });
      }
    }
  },


  exportWorkflow: () => {
    const { nodes, edges } = get();
    return JSON.stringify({ nodes, edges }, null, 2);
  },

  importWorkflow: (json: string) => {
    try {
      const { nodes, edges } = JSON.parse(json);
      set({ nodes, edges });
    } catch {
      console.error("Invalid workflow JSON");
    }
  },
  fetchHistory: async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.runs) {
        // Map DB runs to store WorkflowRun type
        const mapped: WorkflowRun[] = data.runs.map((r: any) => ({
          id: r.id,
          startedAt: new Date(r.startedAt).getTime(),
          finishedAt: r.finishedAt ? new Date(r.finishedAt).getTime() : undefined,
          status: r.status as NodeStatus,
          scope: r.scope as any,
          nodeRuns: (r.nodeRuns || []).map((nr: any) => ({
            nodeId: nr.nodeId,
            nodeType: nr.nodeType,
            status: nr.status as NodeStatus,
            startedAt: new Date(nr.startedAt).getTime(),
            finishedAt: nr.finishedAt ? new Date(nr.finishedAt).getTime() : undefined,
            inputs: nr.inputs as any,
            outputs: nr.outputs as any,
          })),
        }));
        set({ history: mapped });
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  },
  deleteHistoryItem: async (id: string) => {
    const { history } = get();
    set({ history: history.filter(h => h.id !== id) });
    try {
      await fetch(`/api/history?id=${id}`, { method: "DELETE" });
    } catch {
      console.error("Failed to delete history item from server");
    }
  },
  clearHistory: async () => {
    set({ history: [] });
    try {
      await fetch("/api/history", { method: "DELETE" });
    } catch {
      console.error("Failed to clear history from server");
    }
  },
}), {
  partialize: (state) => ({
    nodes: state.nodes,
    edges: state.edges,
  }),
}));
