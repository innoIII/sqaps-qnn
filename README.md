# Live Lecture AI Question Portal & Dashboard
## منصة الأسئلة التفاعلية للمحاضرة ولوحة المحاضر المباشرة

A modern, full-stack, responsive web application designed for live classrooms and lectures. It provides two connected interfaces:
1. **User Question Portal (`/ask`)**: Mobile-first portal where students scan a QR code, consult an AI formulation assistant to refine questions, review/edit the question in a note field, and submit it.
2. **Lecturer Display Dashboard (`/dashboard`)**: Real-time display for the lecturer updating automatically via Server-Sent Events (SSE) without full-page reloads.

---

## 🚀 Key Features

- **📱 Mobile-First Student Portal (`/ask`)**: No account or login required. Extremely fast and intuitive.
- **🤖 Pluggable AI Question Formulation Assistant**:
  - Interactive academic chatbot powered by Gemini (`gemini-3.8-flash`) or OpenAI.
  - "Use This Question" ("استخدم هذا السؤال") button copies the formulated question into the text field for manual editing.
  - Graceful fallback mode ensures students can always write and submit questions even if the AI service hits limits or is offline.
- **📡 Real-Time Lecturer Feed (`/dashboard`)**:
  - Instant live updates using **Server-Sent Events (SSE)** with automatic polling fallback.
  - Sound chime alert on newly arriving questions (synthesized via Web Audio API).
  - High-contrast **Projector Mode** for lecture hall screens.
  - Live statistics: Total questions, Unanswered, Answered, Latest question timestamp.
  - Actions: Mark as Answered, Mark as New, Delete.
- **🔲 QR Code Generator Utility (`/qr`)**:
  - Generates high-resolution QR codes pointing directly to `/ask?session={id}`.
  - Download as PNG, SVG, or Print directly for the projector.
- **🌐 Full Bilingual Support (Arabic & English)**:
  - Default Arabic interface with proper RTL (`dir="rtl"`) layout and typography.
  - One-click toggle between Arabic and English.
- **🔒 Enterprise Security**:
  - AI API keys remain 100% server-side; never exposed to browser bundles.
  - Input validation, character limits, anti-spam duplicate prevention, and session rate limiting.

---

## 🏗️ Architecture

```
Student Phone (Browser)                Lecturer Display (Browser)
       │                                         ▲
       │ [Scan QR]                               │ [Live SSE / Polling]
       ▼                                         │
┌───────────────────────────┐         ┌───────────────────────────┐
│ User Question Portal      │         │ Lecturer Dashboard        │
│ (/ask)                    │         │ (/dashboard)              │
│ - AI Formulation Chatbot  │         │ - Live Questions Feed     │
│ - "Use This Question"     │         │ - Real-Time Stats         │
│ - Note Field & Submit     │         │ - Projector High-Contrast │
└─────────────┬─────────────┘         └─────────────▲─────────────┘
              │ POST /api/questions                 │
              │ POST /api/ai/chat                   │ GET /api/questions/stream
              ▼                                     │
┌───────────────────────────────────────────────────┴─────────────┐
│                      Backend API Server                         │
│  - /api/questions (CRUD)                                        │
│  - /api/questions/stream (SSE Broadcast)                        │
│  - /api/ai/chat (Pluggable AI Service)                          │
└─────────────┬─────────────────────────────────────┬─────────────┘
              │                                     │
              ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│ Pluggable AI Service      │         │ Database Storage Layer    │
│ - Gemini (@google/genai)  │         │ - Question Repository     │
│ - OpenAI Provider         │         │ - In-Memory + File Sync   │
│ - Fallback Rule Engine    │         │ - Prisma Schema Ready     │
└───────────────────────────┘         └───────────────────────────┘
```

---

## 🛠️ Setup & Local Development

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or bun

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your configuration:
```env
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-api-key"
AI_MODEL="gemini-3.8-flash"
PORT=3000
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` (or `http://localhost:3000/ask` and `http://localhost:3000/dashboard`).

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🤖 Configuring AI Providers

The application uses a pluggable abstraction (`src/lib/ai/index.ts`). You can switch providers via environment variables without changing frontend code:

### Google Gemini (Recommended)
```env
AI_PROVIDER="gemini"
GEMINI_API_KEY="AIzaSy..."
AI_MODEL="gemini-3.8-flash"
```

### OpenAI Compatible
```env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"
```

### Offline / Fallback Mode
If no API keys are provided or quota is exceeded, the server automatically routes requests to the fallback formulation engine with zero downtime.

---

## 🗄️ Database & Prisma Migration

The project comes with an active repository storage layer (`src/lib/database/index.ts`) and a production Prisma schema (`prisma/schema.prisma`).

To connect to a managed PostgreSQL or Supabase database:
1. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
   ```
2. Generate Prisma Client and run migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

## 📋 End-to-End Testing Flow

1. Open `/dashboard` in one browser tab (Lecturer view).
2. Open `/ask` in a second tab or on a mobile phone (Student view).
3. In the student view, type a rough idea in the AI chat:
   - *"أنا مش فاهم الفرق بين المفهومين الأول والثاني"*
4. The AI responds with guidance and a suggested question box.
5. Click **"استخدم هذا السؤال" (Use This Question)**.
6. The question is copied into the note field. Edit if desired.
7. Click **"إرسال السؤال" (Send Question)**.
8. The confirmation screen appears with reference ID.
9. Check the lecturer tab: **The question appears live in the feed without refreshing the page!**
