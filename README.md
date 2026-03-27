<div align="center">
  <br />
  <h1 align="center">🌌 NextFlow AI Orchestrator 🚀</h1>
  <p align="center">
    <strong>A unified, visual Directed Acyclic Graph (DAG) workflow engine for multimodal generative AI automation.</strong>
  </p>
  <br />
</div>

---

**NextFlow AI** is a cutting-edge node-based visual programming environment. It allows users to visually compose complex AI pipelines by connecting text prompts, image inputs, video frame extraction, and automated fallback LLMs on an infinitely scalable canvas.

This repository features a **unified architecture**, where the Next.js frontend and the Trigger.dev background workers coexist in a single, high-performance codebase for simplified development and deployment.

---

## 📑 Table of Contents

- [✨ Core Features](#-core-features)
- [🏗️ Unified Architecture](#️-unified-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [🚀 Getting Started](#-getting-started)
  - [1. Clone & Install](#1-clone--install)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Database & Prisma](#3-database--prisma)
  - [4. Running the App](#4-running-the-app)
- [🧠 Using the App](#-using-the-app)

---

## ✨ Core Features

*   **⚡ Unified Execution Engine**: Fully dependency-aware asynchronous scheduler powered by Trigger.dev. Node execution automatically cascades as multi-input convergence points resolve.
*   **👁️ Multimodal AI Capabilities**:
    *   Native integration with **Google Gemini (2.0/2.5 Flash/Pro)** for high-speed, cost-effective multimodal vision workflows.
    *   🛡️ **High-Availability Fallback**: If the primary Google API hits rate limits or conflicts, nodes automatically pivot to **Groq's Qwen-32B** or **Llama 3.2** for guaranteed execution.
*   **🎥 Cloud Media Processing**: Integrated with **Transloadit** for robust, cloud-native FFMPEG tasks including split-second video frame extraction and percentage-based image cropping.
*   **🖱️ Premium Visual Canvas**:
    *   Built on **React Flow v11**, featuring resizable nodes (`@reactflow/node-resizer`) and fluid glassmorphism UI.
    *   Immersive **Markdown Readers** for AI results, featuring full-screen focus modes and rich typography.

---

## 🏗️ Unified Architecture

NextFlow uses a modern, single-repository structure for both the web interface and background processing:

```text
NextFlow/
├── prisma/               # Unified Database Schema (Postgres)
├── public/               # Static Assets
├── src/
│   ├── app/              # Next.js App Router (Pages & API)
│   │   ├── api/          # Unified API Layer (Execute, History, Run)
│   ├── trigger/          # Trigger.dev v3 Background Workers
│   │   ├── geminiTask.ts # LLM Node Logic
│   │   └── ffmpegTasks.ts# Media Node Logic
│   ├── components/       # Visual Canvas & UI Components
│   ├── lib/              # Shared Utilities (Prisma, Clerk)
│   ├── store/            # Unified State Management (Zustand + Zundo)
│   └── proxy.ts          # Root Authentication Middleware
├── trigger.config.ts     # Background Worker Configuration
└── package.json          # Combined Scripts & Dependencies
```

---

## 🛠️ Technology Stack

- **Framework**: Next.js (App Router, React 19)
- **Visual Engine**: React Flow (DAG Visualization)
- **Background Worker**: Trigger.dev v3 (Task Orchestration)
- **Database**: Prisma ORM + Neon Serverless Postgres
- **Auth**: Clerk (Identity Management)
- **Styling**: TailwindCSS 4 (Modern CSS Architecture)
- **State**: Zustand + Zundo (Undo/Redo Canvas History)

---

## 🚀 Getting Started

To run NextFlow AI, you must launch both the Next.js server and the Trigger.dev worker from the project root.

### Prerequisites
- **Node.js**: v20+
- Accounts for: [Clerk](https://clerk.com), [Neon Postgres](https://neon.tech), [Gemini AI Studio](https://aistudio.google.com/), and [Trigger.dev](https://trigger.dev/).

### 1. Clone & Install

```bash
git clone https://github.com/your-username/nextflow.git
cd nextflow
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/sign-in


# AI & Media Keys
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY=5ddd...
TRANSLOADIT_AUTH_SECRET=46ce...

# Database & Trigger.dev
DATABASE_URL="postgresql://user:pass@neon.tech/neondb?sslmode=require"
TRIGGER_SECRET_KEY=tr_dev_...
```

### 3. Database & Prisma

Initialize your database schema and local client:

```bash
npx prisma db push
npx prisma generate
```

### 4. Running the App

You must run these in two separate terminal windows:

**Terminal 1 (Web Interface):**
```bash
npm run dev
# App live at http://localhost:3000
```

**Terminal 2 (Background Worker):**
```bash
npm run dev:trigger
# This starts the local worker for executing AI & Media tasks
```

---

## 🧠 Using the App

1. **Composition**: Drag & Drop nodes (Text, Image, LLM, etc.) onto the canvas.
2. **Connections**: Logically link outputs to inputs to build your pipeline.
3. **Execution**: Click **Run Workflow** to trigger the topological sort and execute the DAG through Trigger.dev.
4. **History**: View past results and node-specific metrics in the **History Panel**.

---

<div align="center">
  <sub>Built with ❤️ utilizing Next.js and Trigger.dev v3 Background Workers.</sub>
</div>
