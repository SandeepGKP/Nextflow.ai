<div align="center">
  <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop" width="100%" height="50%" alt="Header Image" style="border-radius: 12px; margin-bottom: 20px;" />
  
  <h1>🌌 NextFlow AI Orchestrator</h1>
  
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img src="https://img.shields.io/badge/Trigger.dev_v3-3B82F6?style=for-the-badge&logo=fastapi&logoColor=white" />
    <img src="https://img.shields.io/badge/Prisma_Postgres-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
    <img src="https://img.shields.io/badge/Clerk_Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" />
  </p>

  <p align="center">
    <b>A professional-grade, visual DAG engine for industrial AI media automation.</b>
  </p>
</div>

---

### 📘 Overview

**NextFlow AI** is a cutting-edge node-based visual programming environment. It allows users to visually compose complex AI pipelines by connecting text prompts, image inputs, video frame extraction, and automated fallback LLMs on an infinitely scalable canvas.

---

### ⚡ Core Capabilities

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h4>⚡ Unified Execution Engine</h4>
      <p>Fully dependency-aware asynchronous scheduler powered by <b>Trigger.dev v3</b>. Node execution automatically cascades as multi-input convergence points resolve.</p>
    </td>
    <td width="50%" valign="top">
      <h4>🛡️ Multi-Model Resilience</h4>
      <p>Intelligent failover that cascades from <b>Gemini 2.0</b> to <b>Groq (Llama 4)</b>, ensuring 100% vision task continuity during API rate limits.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4>🎥 Cloud Media Processing</h4>
      <p>Integrated with <b>Transloadit</b> for robust FFMPEG tasks including split-second video frame extraction and percentage-based image cropping.</p>
    </td>
    <td width="50%" valign="top">
      <h4>🖱️ Premium Visual Canvas</h4>
      <p>Built on <b>React Flow v11</b> with glassmorphism UI, resizable nodes, and real-time execution animations (pulsating glow).</p>
    </td>
  </tr>
</table>

---

### 🏗️ Technical Architecture

NextFlow uses a modern, **unified repository structure** for both the web interface and long-running background workers:

<details open>
<summary>📂 Click to view Detailed Project Structure</summary>

```text
NextFlow/
├── prisma/                 # Database Schema & Migrations
│   └── schema.prisma       # PostgreSQL Models (Neon)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # Serverless Route Handlers
│   │   │   ├── execute/    # Node Execution Logic
│   │   │   ├── history/    # Persistence & Metrics
│   │   │   └── workflows/  # Workflow CRUD Operations
│   │   ├── sign-in/[[...]] # Clerk Authentication
│   │   └── layout.tsx      # Global UI Context
│   ├── components/         # React Components
│   │   ├── canvas/         # React Flow Logic & UI
│   │   ├── nodes/          # Specialized AI/Media Nodes
│   │   └── HistoryPanel.tsx# Progress & Logs Sidebar
│   ├── trigger/            # Background Tasks (Trigger.dev)
│   │   ├── geminiTask.ts   # Multimodal LLM Logic
│   │   ├── ffmpegTasks.ts  # Media Engine (FFMPEG)
│   │   └── orchestrator.ts # DAG Execution Manager
│   ├── store/              # State (Zustand + Zundo Undo/Redo)
│   └── lib/                # Shared Prisma & Auth Clients
├── .env.local              # Project Secrets & Private Keys
├── trigger.config.ts       # Worker Orchestration Config
└── package.json            # Scripts & Universal Dependencies
```
</details>

---

### 🚀 Setup & Launch

<ol>
  <li>
    <b>Prerequisites</b>
    <p>Ensure you have <b>Node.js v20+</b> and <b>Git</b> installed. You will also need accounts for:</p>
    <ul>
      <li><a href="https://clerk.com">Clerk</a> (Authentication)</li>
      <li><a href="https://neon.tech">Neon Postgres</a> (Database)</li>
      <li><a href="https://aistudio.google.com/">Gemini AI Studio</a> (AI API)</li>
      <li><a href="https://trigger.dev/">Trigger.dev</a> (Background Workers)</li>
    </ul>
  </li>
  <li>
    <b>Clone & Install</b>
    <pre><code>git clone https://github.com/SandeepGKP/Nextflow.ai.git
npm install</code></pre>
  </li>
  <li>
    <b>Environment Setup</b>
    <p>Create a <code>.env.local</code> file in the root directory and configure the following keys:</p>
    <details open>
      <summary>🔑 Click to view required Environment Variables</summary>
      <pre><code># Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/sign-in

# AI & Media Keys
GEMINI_API_KEY=AIzaSy...           # Primary Multimodal LLM
GROQ_API_KEY=gsk_...               # High-Availability Fallback
NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY=...
TRANSLOADIT_AUTH_SECRET=...

# Database & Infrastructure
DATABASE_URL="postgresql://..."     # Neon Postgres URL
TRIGGER_SECRET_KEY=tr_dev_...       # Trigger.dev Secret Key
</code></pre>
    </details>
  </li>
  <li>
    <b>Database Initialization</b>
    <pre><code>npx prisma db push
npx prisma generate</code></pre>
  </li>
  <li>
    <b>Execution (Two Terminals)</b>
    <pre><code>npm run dev          # Terminal 1: Web UI
npm run dev:trigger  # Terminal 2: AI Engine</code></pre>
  </li>
</ol>

---

### ☁️ Deployment

To go live, follow these professional deployment steps:

*   **Frontend**: Push your code to <b>GitHub</b> and connect it to <b>Vercel</b>. All <code>.env.local</code> keys must be added as "Environment Variables" in the Vercel Dashboard.
*   **Background Worker**: Deploy your tasks to <b>Trigger.dev Cloud</b> using:
    <pre><code>npm run deploy:trigger</code></pre>
*   **Database**: Ensure your <b>Neon Postgres</b> instance is accessible and the <code>DATABASE_URL</code> is correctly set on both Vercel and Trigger.dev.

---

---

### 🧠 Future Roadmap & Brainstorming

Current goals for **NextFlow v2.0**:

- [ ] **Agentic Memory**: Store conversation context across entire workflows for "Long-Term Memory."
- [ ] **Collaborative Canvas**: Multi-player real-time editing (like Figma) using WebSockets.
- [ ] **Action Nodes**: Integrate **Slack/Discord/Stripe** to turn text/media outputs into real-world actions.
- [ ] **Template Marketplace**: Community-shared "Recipes" for complex task automation.
- [ ] **Edge Execution**: Moving lighter media tasks to client-side WebAssembly (WASM) for faster processing.

---

<div align="center">
  <sub>Built with ❤️ utilizing Next.js 15, Trigger.dev v3, and Google Gemini.</sub>
  <br/>
  <sub>&copy; 2026 NextFlow AI Orchestrator</sub>
</div>
