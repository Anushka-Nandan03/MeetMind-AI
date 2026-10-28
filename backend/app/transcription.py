
from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_model():
    return WhisperModel(
        "small",
        device="cpu",
        compute_type="int8",
    )


def transcribe_file(
    file_path: str,
    language: str | None = None,
):
    model = get_model()

    # None allows Faster-Whisper to detect the language automatically.
    selected_language = language if language else None

    segments, info = model.transcribe(
        file_path,
        language=selected_language,
        task="transcribe",
        beam_size=5,
        vad_filter=False,
        condition_on_previous_text=False,
    )

    transcript_segments = []

    for segment in segments:
        text = segment.text.strip()

        if text:
            transcript_segments.append(
                {
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": text,
                }
            )

    transcript = " ".join(
        item["text"] for item in transcript_segments
    )

    return {
        "language": info.language,
        "language_probability": round(
            info.language_probability, 3
        ),
        "duration": round(info.duration, 2),
        "segments": transcript_segments,
        "transcript": transcript,
    }
