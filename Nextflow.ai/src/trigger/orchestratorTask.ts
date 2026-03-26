import { task } from "@trigger.dev/sdk/v3";
import { executeGeminiLLM } from "./geminiTask.js";
import { executeCropImage, executeExtractFrame } from "./ffmpegTasks.js";

interface NodePayload {
  id: string;
  type: string;
  data: Record<string, any>;
}

interface OrchestratorPayload {
  workflowRunId: string;
  nodes: NodePayload[];
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
}

/** Kahn's algorithm topological sort */
function topoSort(nodes: NodePayload[], edges: OrchestratorPayload["edges"]): NodePayload[] {
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  const adj = new Map(nodes.map((n) => [n.id, [] as string[]]));
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  }
  const queue = nodes.filter((n) => inDeg.get(n.id) === 0);
  const sorted: NodePayload[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    sorted.push(n);
    for (const nbr of adj.get(n.id) || []) {
      const deg = (inDeg.get(nbr) || 1) - 1;
      inDeg.set(nbr, deg);
      if (deg === 0) queue.push(nodes.find((x) => x.id === nbr)!);
    }
  }
  return sorted;
}

export const workflowOrchestrator = task({
  id: "workflow-orchestrator",
  run: async (payload: OrchestratorPayload) => {
    const nodes = payload?.nodes || [];
    const edges = payload?.edges || [];
    const workflowRunId = payload?.workflowRunId;

    if (nodes.length === 0) {
      console.log("No nodes to execute in workflow orchestrator.");
      return { status: "success", message: "Empty workflow" };
    }

    const results: Record<string, any> = {};
    const inDegrees = new Map(nodes.map((n) => [n.id, edges.filter((e) => e.target === n.id).length]));
    const outEdgesMap = new Map(nodes.map((n) => [n.id, edges.filter((e) => e.source === n.id)]));
    
    const nodeConfigs = new Map(nodes.map(n => [n.id, n]));

    async function executeNode(nodeId: string): Promise<void> {
      const node = nodeConfigs.get(nodeId)!;
      
      // Gather inputs from resolved results
      const inEdges = edges.filter((e) => e.target === nodeId);
      const inputs: Record<string, any> = {};
      for (const e of inEdges) {
        if (results[e.source] !== undefined) {
          inputs[e.targetHandle || "input"] = results[e.source];
        }
      }

      try {
        switch (node.type) {
          case "text":
            results[node.id] = node.data.text || "";
            break;
          case "uploadImage":
            results[node.id] = node.data.imageUrl || null;
            break;
          case "uploadVideo":
            results[node.id] = node.data.videoUrl || null;
            break;
          case "cropImage": {
            const r = await executeCropImage.triggerAndWait({
              imageUrl: inputs.image || node.data.imageUrl,
              x: Number(inputs.x ?? node.data.x ?? 0),
              y: Number(inputs.y ?? node.data.y ?? 0),
              width: Number(inputs.width ?? node.data.width ?? 100),
              height: Number(inputs.height ?? node.data.height ?? 100),
              nodeId: node.id,
            });
            results[node.id] = r.ok ? r.output.croppedUrl : null;
            break;
          }
          case "extractFrame": {
            const r = await executeExtractFrame.triggerAndWait({
              videoUrl: inputs.video || node.data.videoUrl,
              timestamp: inputs.timestamp ?? node.data.timestamp ?? "0",
              nodeId: node.id,
            });
            results[node.id] = r.ok ? r.output.frameUrl : null;
            break;
          }
          case "runLlm": {
            const imageInputs: string[] = inputs.images ? [inputs.images].flat() : [];
            const r = await executeGeminiLLM.triggerAndWait({
              model: node.data.model || "gemini-1.5-flash",
              systemPrompt: inputs.system_prompt || node.data.systemPrompt,
              userMessage: inputs.user_message || node.data.userMessage || (imageInputs.length > 0 ? "Please analyze the provided input." : "Hello!"),
              imageBase64s: imageInputs,
              nodeId: node.id,
              workflowRunId,
            });
            results[node.id] = r.ok ? r.output.output : null;
            break;
          }
        }
      } catch (err) {
        console.error(`Node ${node.id} failed:`, err);
        results[node.id] = null;
      }

      // Trigger dependents
      const dependents = outEdgesMap.get(nodeId) || [];
      const nextToRun: Promise<void>[] = [];
      
      for (const edge of dependents) {
        const targetId = edge.target;
        const remaining = (inDegrees.get(targetId) || 1) - 1;
        inDegrees.set(targetId, remaining);
        if (remaining === 0) {
          nextToRun.push(executeNode(targetId));
        }
      }
      
      if (nextToRun.length > 0) {
        await Promise.all(nextToRun);
      }
    }

    // Start with all nodes that have 0 in-degree
    const entryNodes = nodes.filter((n) => inDegrees.get(n.id) === 0);
    await Promise.all(entryNodes.map((n) => executeNode(n.id)));


    return { workflowRunId, results };
  },
});
