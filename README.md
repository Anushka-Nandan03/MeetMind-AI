# MeetMind AI 🎙️

An AI-powered meeting intelligence assistant that transforms meeting recordings into transcripts, summaries, key decisions, and actionable tasks.

## ✨ Features

- 🎧 Audio and video meeting transcription
- 📝 AI-generated meeting summaries
- ✅ Action items and task extraction
- 🔍 Key discussion points and decisions
- 🗂️ Meeting history and management
- 🌐 Web-based interface

## 🛠️ Tech Stack

**Frontend:** React, TypeScript, Vite

**Backend:** Python, FastAPI

**Speech Recognition:** Faster-Whisper

**Database:** Supabase

**AI Summarization:** Configured AI provider

## 📁 Project Structure

```text
MeetMind-AI/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── transcription.py
│   │   ├── summarization.py
│   │   └── supabase_client.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── supabase/
│   └── schema.sql
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- Python
- Node.js and npm
- Supabase project, if using database features
- Any API credentials required by your configured AI provider

### 1. Clone the repository

```bash
git clone https://github.com/Anushka-Nandan03/MeetMind-AI.git
cd MeetMind-AI
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file by copying `.env.example` to `.env`, then configure the required credentials.

### 3. Start the backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The API documentation is available at:

`http://127.0.0.1:8000/docs`

### 4. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## 🔐 Security

- Never commit real API keys or passwords.
- Keep secrets in local `.env` files.
- Use `.env.example` only for placeholder values.
- Review database access policies before deploying.

## 📌 Project Status

Under active development.

## 👩‍💻 Author

**Anushka Nandan**

- GitHub: [Anushka-Nandan03](https://github.com/Anushka-Nandan03)
