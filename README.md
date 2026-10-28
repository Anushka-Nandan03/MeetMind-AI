# MeetMind AI 🎙️

**MeetMind AI** is an AI-powered meeting intelligence assistant that transforms meeting recordings into transcripts, summaries, key points, decisions, and actionable tasks.

The application combines speech-to-text transcription with AI-powered summarization to help users review meetings and keep track of important tasks.

## ✨ Features

- **Audio and Video Transcription:** Convert supported meeting recordings into text.
- **Multi-language Support:** Choose Auto-detect or a supported language, including English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, and Urdu.
- **Timestamped Transcripts:** View transcript segments with timestamps.
- **AI-Powered Summaries:** Generate concise meeting overviews.
- **Key Point Extraction:** Identify important topics discussed during meetings.
- **Decision Tracking:** Extract decisions mentioned in the transcript.
- **Action Item Extraction:** Identify tasks, owners, and deadlines when supported by the transcript.
- **Meeting History:** Save and retrieve meeting records using Supabase.
- **Copy and Download:** Copy meeting content and download transcript and summary text files.
- **Local AI Summarization:** Use Ollama with the `qwen2.5:3b` model to generate summaries locally.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Speech Recognition | Faster-Whisper |
| AI Summarization | Ollama, Qwen 2.5 3B |
| Database | Supabase |
| API Communication | REST API |

## 📁 Project Structure

```text
MeetMind-AI/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── transcription.py
│   │   └── summarization.py
│   ├── .env
│   └── .venv/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

*Note: This is a representative structure. Your actual project may contain additional files. Keep `.env` and `.venv` local and do not commit them.*

## 🚀 Getting Started

### Prerequisites

Install the following tools:

- Python
- Node.js and npm
- [Ollama](https://ollama.com/)
- A Supabase project configured for meeting history

### 1. Clone the Repository

```bash
git clone https://github.com/Anushka-Nandan03/MeetMind-AI.git
cd MeetMind-AI
```

### 2. Set Up the Backend

Open a terminal in the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies using the dependency file available in the repository. If `requirements.txt` exists, run:

```powershell
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a local `.env` file using the variable names expected by your backend code.

For example, if your implementation uses these names:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_key
```

Replace the example values with your actual configuration. Do not commit the `.env` file, private credentials, or database service-role keys to GitHub.

### 4. Set Up Ollama

Install and start Ollama, then download the model:

```powershell
ollama pull qwen2.5:3b
```

Verify that the model is available:

```powershell
ollama list
```

The current summarization implementation uses the local Ollama chat API:

```text
http://localhost:11434/api/chat
```

### 5. Start the Backend

From the `backend` directory, activate the virtual environment if necessary and run:

```powershell
uvicorn app.main:app --reload --port 8003
```

The backend should be available at:

- API root: http://127.0.0.1:8003/
- Health check: http://127.0.0.1:8003/api/health
- Interactive API documentation: http://127.0.0.1:8003/docs

Keep the backend terminal running.

### 6. Start the Frontend

Open a second terminal:

```powershell
cd D:\MeetMind-AI\frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

Ensure the frontend API URL matches the backend configuration:

```text
http://127.0.0.1:8003
```

If the project is stored in a different directory, update the frontend path accordingly.

## 📖 How to Use

1. Start Ollama, the FastAPI backend, and the frontend.
2. Open MeetMind AI in your browser.
3. Upload a supported meeting recording: MP3, WAV, M4A, WEBM, or MP4.
4. Select the recording language or choose Auto-detect.
5. Generate the transcript.
6. Review the transcript and timestamped segments.
7. Generate the AI meeting summary.
8. Review the overview, key points, decisions, and action items.
9. Copy or download the transcript and summary.
10. Access previously saved meetings through meeting history.

## 🔌 API Endpoints

The backend currently includes these endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check API status |
| GET | `/api/health` | Check backend health |
| POST | `/api/transcribe` | Transcribe an uploaded recording |
| POST | `/api/summarize` | Generate a meeting summary |
| GET | `/api/meetings` | Retrieve saved meeting history |
| POST | `/api/meetings` | Save a meeting record |

For the exact request formats and response schemas, open:

http://127.0.0.1:8003/docs

## ⚠️ Current Limitations

- Speech recognition can make mistakes with names, accents, background noise, and similar-sounding words.
- AI-generated summaries and action items may contain errors or omit information.
- Task ownership and deadlines must be checked against the original transcript.
- Reliable speaker diarization and automatic speaker labels are not yet implemented.
- Hindi-English mixed-language transcription may be less accurate than single-language transcription.
- Transcription performance depends on the recording length, hardware, and selected model.

Always review generated meeting notes before relying on them.

## 🗺️ Future Improvements

- [ ] Add speaker diarization and speaker labels.
- [ ] Improve action-item extraction and owner assignment.
- [ ] Improve deadline detection and validation.
- [ ] Improve Hindi-English mixed-language transcription.
- [ ] Add meeting search and advanced history filters.
- [ ] Improve automated testing and error handling.
- [ ] Enhance accessibility and responsive design.

## 🔐 Security

- Keep credentials and API keys in backend environment variables.
- Never upload `.env`, private keys, or access tokens to GitHub.
- Keep secrets out of frontend code and public browser bundles.
- Configure Supabase access policies and Row Level Security before storing sensitive meeting data.
- Only process recordings you have permission to upload and transcribe.

## 👩‍💻 Author

**Anushka Nandan**

- GitHub: [Anushka-Nandan03](https://github.com/Anushka-Nandan03)

---

*MeetMind AI — Turning meeting conversations into actionable insights.*
