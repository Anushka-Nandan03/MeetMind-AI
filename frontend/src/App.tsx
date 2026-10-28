
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import "./App.css";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  filename: string;
  language: string;
  language_probability: number;
  duration: number;
  segments: TranscriptSegment[];
  transcript: string;
}

interface ActionItem {
  task?: string;
  owner?: string | null;
  deadline?: string | null;
  due_date?: string | null;
  status?: string;
}

interface MeetingSummary {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: (string | ActionItem)[];
}

interface SavedMeeting {
  id: string | number;
  title: string;
  transcript: string;
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: (string | ActionItem)[];
  language?: string | null;
  duration_seconds?: number | null;
  created_at?: string;
}

const API_URL = "http://127.0.0.1:8003";

const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".webm", ".mp4"];

async function readResponse(response: Response): Promise<any> {
  const text = await response.text();

  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `The server returned an invalid response (HTTP ${response.status}).`
      );
    }
  }

  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : `Request failed with status ${response.status}.`;

    throw new Error(detail);
  }

  return data;
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
}

function formatDate(date?: string): string {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleString();
}

function normalizeActionItems(value: unknown): (string | ActionItem)[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string | ActionItem =>
      typeof item === "string" ||
      (typeof item === "object" &&
        item !== null &&
        !Array.isArray(item))
  );
}

function getActionText(item: string | ActionItem): string {
  if (typeof item === "string") return item;

  const parts = [
    item.task || "Untitled task",
    item.owner ? `Owner: ${item.owner}` : "",
    item.deadline || item.due_date
      ? `Deadline: ${item.deadline || item.due_date}`
      : "",
    item.status ? `Status: ${item.status}` : "",
  ].filter(Boolean);

  return parts.join(" | ");
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryCopyMessage, setSummaryCopyMessage] = useState("");
  const [meetingSaveStatus, setMeetingSaveStatus] = useState("");
  const [meetingSaveError, setMeetingSaveError] = useState("");

  const [meetings, setMeetings] = useState<SavedMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState("");
  const [meetingSearch, setMeetingSearch] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<
    string | number | null
  >(null);

  const loadMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    setMeetingsError("");

    try {
      const response = await fetch(`${API_URL}/api/meetings`);
      const data = await readResponse(response);

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data.meetings)
          ? data.meetings
          : [];

      const normalized: SavedMeeting[] = rows.map(
        (meeting: any, index: number) => ({
          id: meeting.id ?? `meeting-${index}`,
          title: meeting.title || "Untitled meeting",
          transcript: meeting.transcript || "",
          summary: meeting.summary || "",
          key_points: Array.isArray(meeting.key_points)
            ? meeting.key_points.filter(
                (item: unknown): item is string =>
                  typeof item === "string"
              )
            : [],
          decisions: Array.isArray(meeting.decisions)
            ? meeting.decisions.filter(
                (item: unknown): item is string =>
                  typeof item === "string"
              )
            : [],
          action_items: normalizeActionItems(meeting.action_items),
          language: meeting.language ?? null,
          duration_seconds: meeting.duration_seconds ?? null,
          created_at: meeting.created_at,
        })
      );

      setMeetings(normalized);
    } catch (err) {
      setMeetingsError(
        err instanceof Error
          ? err.message
          : "Could not load saved meetings."
      );
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const filteredMeetings = meetings.filter((meeting) => {
    const query = meetingSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      meeting.title.toLowerCase().includes(query) ||
      meeting.summary.toLowerCase().includes(query)
    );
  });

  function clearSummary() {
    setSummary(null);
    setSummaryError("");
    setSummaryCopyMessage("");
    setMeetingSaveStatus("");
    setMeetingSaveError("");
  }

  function selectFile(selectedFile?: File) {
    setError("");
    setCopyMessage("");
    clearSummary();
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const dotIndex = selectedFile.name.lastIndexOf(".");
    const extension =
      dotIndex >= 0 ? selectedFile.name.slice(dotIndex).toLowerCase() : "";

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setFile(null);
      setError("Unsupported format. Choose MP3, WAV, M4A, WEBM, or MP4.");
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setFile(null);
      setError("Your file must be 100 MB or smaller.");
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError("The selected file is empty.");
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (loading || summaryLoading) return;

    selectFile(event.dataTransfer.files?.[0]);
  }

  async function handleTranscribe() {
    if (!file || loading) {
      if (!file) setError("Please select a recording first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCopyMessage("");
    clearSummary();

    const formData = new FormData();
    formData.append("file", file);

    const query = language
      ? `?language=${encodeURIComponent(language)}`
      : "";

    try {
      const response = await fetch(`${API_URL}/api/transcribe${query}`, {
        method: "POST",
        body: formData,
      });

      const data = await readResponse(response);

      if (typeof data.transcript !== "string") {
        throw new Error("The API response did not contain a transcript.");
      }

      setResult({
        filename: data.filename || file.name,
        language: data.language || "unknown",
        language_probability: Number(data.language_probability || 0),
        duration: Number(data.duration || 0),
        segments: Array.isArray(data.segments) ? data.segments : [],
        transcript: data.transcript,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transcription failed.";

      setError(
        message.includes("Failed to fetch")
          ? `Cannot connect to ${API_URL}. Make sure the FastAPI backend is running.`
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary(transcript: string) {
    if (!transcript.trim()) {
      setSummaryError("No transcript is available to summarize.");
      return;
    }

    if (summaryLoading) return;

    setSummaryLoading(true);
    setSummaryError("");
    setSummaryCopyMessage("");
    setSummary(null);
    setMeetingSaveStatus("");
    setMeetingSaveError("");

    try {
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      const data = await readResponse(response);

      if (typeof data.summary !== "string") {
        throw new Error("The API response did not contain a valid summary.");
      }

      const summaryData: MeetingSummary = {
        summary: data.summary,
        key_points: Array.isArray(data.key_points)
          ? data.key_points.filter(
              (item: unknown): item is string =>
                typeof item === "string"
            )
          : [],
        decisions: Array.isArray(data.decisions)
          ? data.decisions.filter(
              (item: unknown): item is string =>
                typeof item === "string"
            )
          : [],
        action_items: normalizeActionItems(data.action_items),
      };

      setSummary(summaryData);
      setMeetingSaveStatus("Saving meeting...");

      try {
        const rawTitle = result?.filename || file?.name || "Meeting";
        const title = rawTitle.replace(/\.[^/.]+$/, "").trim() || "Meeting";

        const saveResponse = await fetch(`${API_URL}/api/meetings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            transcript,
            summary: summaryData.summary,
            key_points: summaryData.key_points,
            decisions: summaryData.decisions,
            action_items: summaryData.action_items,
            language: result?.language || null,
            duration_seconds:
              typeof result?.duration === "number"
                ? Math.round(result.duration)
                : null,
          }),
        });

        await readResponse(saveResponse);

        setMeetingSaveStatus("Meeting saved successfully!");
        await loadMeetings();
      } catch (saveErr) {
        const message =
          saveErr instanceof Error
            ? saveErr.message
            : "Could not save the meeting.";

        setMeetingSaveStatus("");
        setMeetingSaveError(message);
        console.error("Meeting save failed:", saveErr);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not generate the meeting summary.";

      setSummaryError(
        message.includes("Failed to fetch")
          ? `Cannot connect to ${API_URL}. Check that FastAPI is running.`
          : message
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      return successMessage;
    } catch {
      return "";
    }
  }

  async function copyTranscript() {
    if (!result) return;

    const message = await copyText(
      result.transcript,
      "Transcript copied!"
    );

    if (message) {
      setCopyMessage(message);
    } else {
      setError("Copy failed. Please select the transcript and copy it manually.");
    }
  }

  function downloadText(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadTranscript() {
    if (!result) return;

    const baseName = (result.filename || file?.name || "meeting").replace(
      /\.[^/.]+$/,
      ""
    );

    downloadText(result.transcript, `${baseName}-transcript.txt`);
  }

  function buildSummaryText(data: MeetingSummary): string {
    return [
      "MEETING SUMMARY",
      "===============",
      data.summary,
      "",
      "KEY POINTS",
      "----------",
      ...(data.key_points.length
        ? data.key_points.map((point) => `- ${point}`)
        : ["- No key points identified."]),
      "",
      "DECISIONS",
      "---------",
      ...(data.decisions.length
        ? data.decisions.map((decision) => `- ${decision}`)
        : ["- No decisions identified."]),
      "",
      "ACTION ITEMS",
      "------------",
      ...(data.action_items.length
        ? data.action_items.map((item) => `- ${getActionText(item)}`)
        : ["- No action items identified."]),
    ].join("\n");
  }

  async function copySummary() {
    if (!summary) return;

    const message = await copyText(
      buildSummaryText(summary),
      "Summary copied!"
    );

    if (message) {
      setSummaryCopyMessage(message);
    } else {
      setSummaryError("Copy failed. Please select and copy the summary manually.");
    }
  }

  function downloadSummary() {
    if (!summary) return;

    const baseName = (
      result?.filename ||
      file?.name ||
      "meeting"
    ).replace(/\.[^/.]+$/, "");

    downloadText(buildSummaryText(summary), `${baseName}-summary.txt`);
  }

  async function copySavedMeeting(meeting: SavedMeeting) {
    const text = [
      meeting.title,
      "",
      "SUMMARY",
      meeting.summary,
      "",
      "TRANSCRIPT",
      meeting.transcript,
      "",
      "KEY POINTS",
      ...meeting.key_points.map((point) => `- ${point}`),
      "",
      "DECISIONS",
      ...meeting.decisions.map((decision) => `- ${decision}`),
      "",
      "ACTION ITEMS",
      ...meeting.action_items.map((item) => `- ${getActionText(item)}`),
    ].join("\n");

    const message = await copyText(text, "Meeting details copied!");

    if (message) {
      setMeetingSaveStatus(message);
    } else {
      setMeetingSaveError("Copy failed. Please copy the meeting details manually.");
    }
  }

  function downloadSavedMeeting(meeting: SavedMeeting) {
    const text = [
      meeting.title,
      `Created: ${formatDate(meeting.created_at)}`,
      "",
      "SUMMARY",
      meeting.summary,
      "",
      "TRANSCRIPT",
      meeting.transcript,
      "",
      "KEY POINTS",
      ...meeting.key_points.map((point) => `- ${point}`),
      "",
      "DECISIONS",
      ...meeting.decisions.map((decision) => `- ${decision}`),
      "",
      "ACTION ITEMS",
      ...meeting.action_items.map((item) => `- ${getActionText(item)}`),
    ].join("\n");

    const baseName = meeting.title.replace(/[<>:"/\\|?*]/g, "-");
    downloadText(text, `${baseName || "meeting"}-details.txt`);
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="MeetMind AI home">
          <span className="brand-icon">M</span>
          <span>
            MeetMind <span className="brand-accent">AI</span>
          </span>
        </a>

        <div className="header-status">
          <span className="status-dot" />
          AI Meeting Intelligence
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <span>✦</span> YOUR MEETINGS, MADE SMARTER
          </div>

          <h1>
            Turn conversations
            <br />
            into <span>clarity.</span>
          </h1>

          <p className="hero-description">
            Upload a meeting recording to generate a transcript and transform
            the conversation into key points, decisions, and actionable tasks.
          </p>
        </section>

        <section className="workspace">
          <div className="section-heading">
            <div>
              <p className="section-label">YOUR WORKSPACE</p>
              <h2>Transcribe a recording</h2>
            </div>
            <span className="step-label">STEP 01 / UPLOAD</span>
          </div>

          <div
            className={`upload-area ${file ? "has-file" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.webm,.mp4"
              onChange={handleFileChange}
              hidden
            />

            <div className="upload-icon">{file ? "✓" : "↑"}</div>

            {file ? (
              <>
                <h3 className="filename">{file.name}</h3>
                <p>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to
                  transcribe
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || summaryLoading}
                >
                  Choose another file
                </button>
              </>
            ) : (
              <>
                <h3>Upload your recording</h3>
                <p>Drag and drop a file here, or browse your computer.</p>
                <button
                  type="button"
                  className="browse-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  Browse files
                </button>
                <span className="file-hint">
                  MP3 · WAV · M4A · WEBM · MP4 · Maximum 100 MB
                </span>
              </>
            )}
          </div>

          <div className="options-row">
            <div className="language-option">
              <label htmlFor="language">Recording language</label>
              <select
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={loading}
              >
                <option value="">Auto-detect language</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="mr">Marathi</option>
                <option value="gu">Gujarati</option>
                <option value="pa">Punjabi</option>
                <option value="ur">Urdu</option>
              </select>
            </div>

            <button
              type="button"
              className="transcribe-button"
              onClick={handleTranscribe}
              disabled={!file || loading || summaryLoading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Transcribing...
                </>
              ) : (
                <>
                  ✦ Transcribe recording <span>→</span>
                </>
              )}
            </button>
          </div>

          {loading && (
            <div className="processing-card" role="status">
              <span className="spinner dark-spinner" />
              <div>
                <strong>Processing your recording</strong>
                <p>
                  The AI model is transcribing your audio. Longer recordings
                  can take a few minutes.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <section className="results">
              <div className="results-heading">
                <div>
                  <p className="section-label">TRANSCRIPTION COMPLETE</p>
                  <h2>Your transcript</h2>
                </div>
                <span className="success-badge">✓ Completed</span>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>LANGUAGE</span>
                  <strong>{result.language.toUpperCase()}</strong>
                </div>
                <div className="stat-card">
                  <span>DURATION</span>
                  <strong>{formatTime(result.duration)}</strong>
                </div>
                <div className="stat-card">
                  <span>SEGMENTS</span>
                  <strong>{result.segments.length}</strong>
                </div>
              </div>

              <div className="transcript-card">
                <div className="transcript-toolbar">
                  <span>Transcript text</span>
                  <div className="result-actions">
                    <button type="button" onClick={copyTranscript}>
                      Copy text
                    </button>
                    <button type="button" onClick={downloadTranscript}>
                      Download .txt
                    </button>
                  </div>
                </div>

                <p className="transcript-text">
                  {result.transcript || "No speech was detected in this recording."}
                </p>

                {copyMessage && (
                  <p className="copy-message" role="status">
                    {copyMessage}
                  </p>
                )}
              </div>

              <section className="summary-section">
                <div className="summary-heading">
                  <div>
                    <p className="section-label">AI-POWERED INSIGHTS</p>
                    <h3>Meeting summary</h3>
                  </div>

                  <button
                    type="button"
                    className="summary-button"
                    onClick={() => generateSummary(result.transcript)}
                    disabled={
                      summaryLoading || loading || !result.transcript.trim()
                    }
                  >
                    {summaryLoading ? (
                      <>
                        <span className="spinner" />
                        Generating...
                      </>
                    ) : summary ? (
                      "Regenerate summary"
                    ) : (
                      "✦ Generate AI summary"
                    )}
                  </button>
                </div>

                {summaryLoading && (
                  <div className="processing-card" role="status">
                    <span className="spinner dark-spinner" />
                    <div>
                      <strong>Analyzing your meeting</strong>
                      <p>
                        Identifying key points, decisions, and action items.
                        This may take a little while.
                      </p>
                    </div>
                  </div>
                )}

                {summaryError && (
                  <div className="error-message" role="alert">
                    <strong>Summary generation failed</strong>
                    <p>{summaryError}</p>
                  </div>
                )}

                {summary && (
                  <div className="summary-results">
                    {meetingSaveStatus && (
                      <p className="copy-message" role="status">
                        {meetingSaveStatus}
                      </p>
                    )}

                    {meetingSaveError && (
                      <div className="error-message" role="alert">
                        <strong>Meeting could not be saved</strong>
                        <p>{meetingSaveError}</p>
                      </div>
                    )}

                    <div className="summary-toolbar">
                      <span className="success-badge">✓ Summary generated</span>
                      <div className="result-actions">
                        <button type="button" onClick={copySummary}>
                          Copy summary
                        </button>
                        <button type="button" onClick={downloadSummary}>
                          Download .txt
                        </button>
                      </div>
                    </div>

                    {summaryCopyMessage && (
                      <p className="copy-message" role="status">
                        {summaryCopyMessage}
                      </p>
                    )}

                    <div className="summary-content">
                      <article className="summary-card summary-overview">
                        <h4>Overview</h4>
                        <p>{summary.summary}</p>
                      </article>

                      <article className="summary-card">
                        <h4>Key points</h4>
                        {summary.key_points.length ? (
                          <ul>
                            {summary.key_points.map((point, index) => (
                              <li key={`${index}-${point}`}>{point}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No key points were identified.</p>
                        )}
                      </article>

                      <article className="summary-card">
                        <h4>Decisions</h4>
                        {summary.decisions.length ? (
                          <ul>
                            {summary.decisions.map((decision, index) => (
                              <li key={`${index}-${decision}`}>{decision}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No explicit decisions were identified.</p>
                        )}
                      </article>

                      <article className="summary-card">
                        <h4>Action items</h4>
                        {summary.action_items.length ? (
                          <ul className="action-list">
                            {summary.action_items.map((item, index) => (
                              <li key={`action-${index}`}>
                                <strong>
                                  {typeof item === "string"
                                    ? item
                                    : item.task || "Untitled task"}
                                </strong>
                                {typeof item !== "string" && item.owner && (
                                  <span>Owner: {item.owner}</span>
                                )}
                                {typeof item !== "string" &&
                                  (item.deadline || item.due_date) && (
                                    <span>
                                      Deadline: {item.deadline || item.due_date}
                                    </span>
                                  )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No action items were identified.</p>
                        )}
                      </article>
                    </div>
                  </div>
                )}
              </section>

              <div className="segments-section">
                <h3>Timestamped segments</h3>
                {result.segments.length ? (
                  result.segments.map((segment, index) => (
                    <div
                      className="segment"
                      key={`${segment.start}-${index}`}
                    >
                      <span className="timestamp">
                        {formatTime(segment.start)} – {formatTime(segment.end)}
                      </span>
                      <p>{segment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="accuracy-note">
                    No timestamped segments were returned.
                  </p>
                )}
              </div>

              <p className="accuracy-note">
                AI-generated transcripts and summaries can contain mistakes.
                Review names, dates, decisions, and assigned tasks before
                relying on them.
              </p>
            </section>
          )}
        </section>
      </main>

      <section className="history-section">
        <div className="section-heading">
          <div>
            <p className="section-label">YOUR WORKSPACE</p>
            <h2>Meeting History</h2>
          </div>

          <button
            type="button"
            className="summary-button"
            onClick={() => void loadMeetings()}
            disabled={meetingsLoading}
          >
            {meetingsLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <input
          className="meeting-search"
          type="search"
          aria-label="Search meetings"
          placeholder="Search meetings by title or summary..."
          value={meetingSearch}
          onChange={(event) => setMeetingSearch(event.target.value)}
        />

        {meetingsError && (
          <div className="error-message" role="alert">
            <strong>Could not load meeting history</strong>
            <p>{meetingsError}</p>
            <button
              type="button"
              className="history-view-button"
              onClick={() => void loadMeetings()}
            >
              Try again
            </button>
          </div>
        )}

        {meetingsLoading ? (
          <p>Loading your saved meetings...</p>
        ) : filteredMeetings.length === 0 ? (
          <p className="history-empty">
            {meetingSearch.trim()
              ? "No meetings match your search."
              : "No saved meetings yet. Upload a recording and generate a summary to get started."}
          </p>
        ) : (
          <div className="history-list">
            {filteredMeetings.map((meeting) => {
              const isSelected = selectedMeetingId === meeting.id;

              return (
                <article className="history-card" key={meeting.id}>
                  <div>
                    <h3>{meeting.title}</h3>
                    <p>{formatDate(meeting.created_at)}</p>
                    {meeting.language && (
                      <p>Language: {meeting.language.toUpperCase()}</p>
                    )}
                    {typeof meeting.duration_seconds === "number" && (
                      <p>Duration: {formatTime(meeting.duration_seconds)}</p>
                    )}
                    <p>{meeting.summary || "No summary available."}</p>
                  </div>

                  <div className="result-actions">
                    <button
                      type="button"
                      className="history-view-button"
                      onClick={() =>
                        setSelectedMeetingId(isSelected ? null : meeting.id)
                      }
                    >
                      {isSelected ? "Hide details" : "View details"}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="history-details">
                      <h4>Overview</h4>
                      <p>{meeting.summary || "No summary available."}</p>

                      <h4>Transcript</h4>
                      <p className="transcript-text">
                        {meeting.transcript || "No transcript available."}
                      </p>

                      <h4>Key points</h4>
                      {meeting.key_points.length ? (
                        <ul>
                          {meeting.key_points.map((point, index) => (
                            <li key={`${index}-${point}`}>{point}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No key points available.</p>
                      )}

                      <h4>Decisions</h4>
                      {meeting.decisions.length ? (
                        <ul>
                          {meeting.decisions.map((decision, index) => (
                            <li key={`${index}-${decision}`}>{decision}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No decisions available.</p>
                      )}

                      <h4>Action items</h4>
                      {meeting.action_items.length ? (
                        <ul>
                          {meeting.action_items.map((item, index) => (
                            <li key={`saved-action-${index}`}>
                              {getActionText(item)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No action items available.</p>
                      )}

                      <div className="result-actions">
                        <button
                          type="button"
                          onClick={() => void copySavedMeeting(meeting)}
                        >
                          Copy meeting details
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSavedMeeting(meeting)}
                        >
                          Download details
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="footer">
        <span>MeetMind AI</span>
        <span>Built to make every conversation count.</span>
      </footer>
    </div>
  );
}

export default App;
