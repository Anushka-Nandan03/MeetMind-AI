
import os
import tempfile
import traceback
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.supabase_client import get_supabase_client
from app.transcription import transcribe_file
from app.summarization import generate_meeting_summary


app = FastAPI(
    title="MeetMind AI API",
    version="0.1.0",
)

# Allow the Vite frontend ports, including the current port 5175.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".webm",
    ".mp4",
}

MAX_FILE_SIZE = 100 * 1024 * 1024


class SummaryRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=100_000)


class MeetingSaveRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    transcript: str = Field(min_length=1, max_length=100_000)
    summary: str = ""
    key_points: list[Any] = Field(default_factory=list)
    decisions: list[Any] = Field(default_factory=list)
    action_items: list[Any] = Field(default_factory=list)
    language: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)


@app.get("/")
def root():
    return {
        "message": "MeetMind AI API is running",
        "version": "0.1.0",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = None,
):
    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload MP3, WAV, M4A, WEBM, or MP4.",
        )

    temp_path = None

    try:
        total_size = 0

        with tempfile.NamedTemporaryFile(
            suffix=extension,
            delete=False,
        ) as temp_file:
            temp_path = temp_file.name

            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File must be 100 MB or smaller.",
                    )

                temp_file.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        result = await run_in_threadpool(
            transcribe_file,
            temp_path,
            language,
        )

        return {
            "filename": file.filename,
            **result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {type(exc).__name__}: {exc}",
        ) from exc

    finally:
        await file.close()

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/summarize")
def summarize_meeting(request: SummaryRequest):
    try:
        return generate_meeting_summary(request.transcript)

    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Summary generation failed: {type(exc).__name__}: {exc}",
        ) from exc


@app.post("/api/meetings")
def save_meeting(request: MeetingSaveRequest):
    try:
        supabase = get_supabase_client()

        meeting_data = {
            "title": request.title,
            "transcript": request.transcript,
            "summary": request.summary,
            "key_points": request.key_points,
            "decisions": request.decisions,
            "action_items": request.action_items,
            "language": request.language,
            "duration_seconds": request.duration_seconds,
        }

        result = (
            supabase.table("meetings")
            .insert(meeting_data)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Meeting was not returned after saving.",
            )

        return {
            "message": "Meeting saved successfully",
            "meeting": result.data[0],
        }

    except HTTPException:
        raise

    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save meeting: {type(exc).__name__}: {exc}",
        ) from exc


@app.get("/api/meetings")
def get_meetings():
    try:
        supabase = get_supabase_client()

        result = (
            supabase.table("meetings")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        meetings = result.data or []

        print(
            f"DEBUG: Fetched {len(meetings)} meetings from Supabase",
            flush=True,
        )

        return {"meetings": meetings}

    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch meetings: {type(exc).__name__}: {exc}",
        ) from exc
