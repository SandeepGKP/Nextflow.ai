import Sidebar from "@/components/Sidebar";
import HistoryPanel from "@/components/HistoryPanel";
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas";

export default function Home() {
  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      <Sidebar />
      <WorkflowCanvas />
      <HistoryPanel />
    </div>
  );
}
