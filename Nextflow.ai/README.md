# NextFlow AI 🌌

![NextFlow Logo](public/favicon.ico)

> A pixel-perfect, node-based LLM workflow orchestrator inspired by Krea.ai.

NextFlow AI provides a canvas-based graph interface to compose visually intuitive, high-performance workflows combining generative multimodal AI with powerful media processing. 

## ✨ Key Features
- **Visual Node Editor**: Powered by `reactflow` to intuitively map connections between AI prompts and media resources.
- **Cascade LLM Engine**: Seamlessly switch or chain executions from Gemini 1.5 Pro to Groq depending on rate limits or functional needs.
- **Media Ingestion & Processing**: Directly upload via `Transloadit` and queue up highly intensive FFmpeg media manipulations (like Video Frame Extraction and Deep Cropping) through serverless `Trigger.dev` background tasks.
- **Rock-solid Auth**: Powered by `@clerk/nextjs` (v7) seamlessly integrated into Next.js 16 Edge runtime via robust Middleware/Proxy strategies.
- **Relational History DB**: Workflow states, outputs, and history persisted heavily with Prisma ORM deployed onto Neon (PostgreSQL).

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (Turbopack, App Router, React 19)
- **Canvas Node Engine**: [React Flow](https://reactflow.dev/)
- **Authentication**: [Clerk v7](https://clerk.dev/)
- **LLM Integrations**: [Google Gemini SDK](https://ai.google.dev/) & [Groq SDK](https://groq.com/)
- **Background Jobs**: [Trigger.dev v3/v4](https://trigger.dev/) (orchestrating `fluent-ffmpeg` workflows)
- **Media Uploads**: [Transloadit](https://transloadit.com/)
- **Database**: [PostgreSQL (Neon)](https://neon.tech/) w/ [Prisma ORM](https://www.prisma.io/)
- **Styling**: Vanilla Custom CSS & Tailwind CSS v4

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/SandeepGKP/Nextflow.ai.git
cd Nextflow.ai
npm install
```

### 2. Configure Environment Variables
Copy `.env` to `.env.local` and substitute your actual API Keys:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/sign-in

# LLM Providers
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...

# Trigger.dev Background Processing
TRIGGER_API_KEY=tr_prod_...
TRIGGER_SECRET_KEY=tr_prod_...

# Transloadit Uploads
NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY=...
TRANSLOADIT_AUTH_SECRET=...

# Prisma Neon DB Postgres 
DATABASE_URL=postgresql://...
```

### 3. Run Migrations & Start Development
Generate Prisma local types, and automatically start up the Next.js Turbopack development server.

```bash
npm run build
npm run dev
```

The application is now accessible locally spinning on `http://localhost:3000`

## 🤝 Contributing
Contributions are always welcome. Ensure that there are no strictly typed Typescript or ESLint errors before committing and pushing your changes, as the Vercel CI is configured with strict TS compilation requirements.

---
**Maintained by SandeepGKP & Team.**
