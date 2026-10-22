import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
const LANGUAGES = [
  { label: "English", value: "en-US" },
  { label: "Hindi", value: "hi-IN" },

  { label: "Kannada", value: "kn-IN" },
 
];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function App() {
  const [language, setLanguage] = useState("en-US");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) =>
      `${item.title} ${item.text} ${item.language}`.toLowerCase().includes(q)
    );
  }, [history, search]);

  async function loadHistory() {
    try {
      const response = await fetch(`${API_BASE}/transcriptions/`);
      if (!response.ok) throw new Error("Could not load history. Check the Django server.");
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : data.results || []);
      setError("");
    } catch (err) {
      setError(`${err.message} Make sure Django and MySQL are running.`);
    }
  }

  useEffect(() => {
    loadHistory();
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
    // Load history once when the app opens.
  }, []);

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported by this browser. Try Google Chrome or Microsoft Edge.");
      return;
    }

    setError("");
    setNotice("");
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      if (finalText) {
        setTranscript((previous) => {
          const clean = previous.trim();
          return clean ? `${clean} ${finalText.trim()}` : finalText.trim();
        });
      }
      // Interim text is displayed in the status line; final text is saved in the editor.
      if (interimText) setNotice(`Hearing: ${interimText}`);
      else setNotice("Listening…");
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}. Check microphone permission and try again.`);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setNotice((current) => current === "Listening…" ? "Listening stopped." : current);
    };

    try {
      recognition.start();
      setIsListening(true);
      setNotice("Listening…");
    } catch (err) {
      setError("Could not start speech recognition. Please try again.");
      setIsListening(false);
    }
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }

  async function saveTranscription(event) {
    event.preventDefault();
    if (!transcript.trim()) {
      setError("Please record or type some text before saving.");
      return;
    }

    const payload = {
      title: title.trim() || `Transcription ${new Date().toLocaleString()}`,
      text: transcript.trim(),
      language,
    };

    try {
      const url = editingId
        ? `${API_BASE}/transcriptions/${editingId}/`
        : `${API_BASE}/transcriptions/`;
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.text?.[0] || details.detail || "Could not save transcription.");
      }
      setNotice(editingId ? "Transcription updated successfully." : "Transcription saved successfully.");
      setError("");
      setEditingId(null);
      setTitle("");
      setTranscript("");
      await loadHistory();
    } catch (err) {
      setError(`${err.message} Check the backend connection.`);
    }
  }

  function editTranscription(item) {
    setEditingId(item.id);
    setTitle(item.title || "");
    setTranscript(item.text || "");
    setLanguage(item.language || "en-US");
    setNotice("Editing selected transcription. Make changes and click Update.");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setTranscript("");
    setNotice("");
    setError("");
  }

  async function deleteTranscription(id) {
    if (!window.confirm("Delete this transcription permanently?")) return;
    try {
      const response = await fetch(`${API_BASE}/transcriptions/${id}/`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error("Could not delete transcription.");
      if (editingId === id) cancelEdit();
      setNotice("Transcription deleted.");
      setError("");
      await loadHistory();
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Text copied to clipboard.");
    } catch {
      setError("Clipboard access failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">ST</div>
        <div>
          {/* <p className="eyebrow">VOICE · TEXT · HISTORY</p> */}
          <h1>Speech to Text</h1>
        </div>
        <span className={`live-pill ${isListening ? "active" : ""}`}>
          <span className="live-dot" /> {isListening ? "Listening live" : "Ready"}
        </span>
      </header>

      <main className="main-content">
       

        {error && <div className="alert error-alert" role="alert">{error}</div>}
        {notice && <div className="alert notice-alert" role="status">{notice}</div>}

        <section className="workspace">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WORKSPACE</p>
              <h3>{editingId ? "Edit transcription" : "Create transcription"}</h3>
            </div>
           
          </div>

          <form onSubmit={saveTranscription}>
            <div className="form-row">
              <label className="field-group">
                <span>Language</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field-group title-field">
                <span>Title <small>(optional)</small></span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Project meeting notes" maxLength={200} />
              </label>
            </div>

            <div className="record-panel">
              <div className="record-panel-top">
                <span className="record-indicator"><span className={isListening ? "pulse-dot" : "static-dot"} /> {isListening ? "MICROPHONE ACTIVE" : "TRANSCRIPTION EDITOR"}</span>
                <span className="character-count">{transcript.length} characters</span>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your transcription will appear here. You can also type or edit text manually…"
                rows={8}
                aria-label="Transcription text"
              />
              <div className="record-actions">
                <div className="record-buttons">
                  {!isListening ? (
                    <button className="button button-primary" type="button" onClick={startListening}>
                      <span className="mic-icon">●</span> Start recording
                    </button>
                  ) : (
                    <button className="button button-stop" type="button" onClick={stopListening}>
                      <span className="stop-icon" /> Stop recording
                    </button>
                  )}
                  <button className="button button-quiet" type="button" onClick={() => copyText(transcript)} disabled={!transcript.trim()}>
                    Copy text
                  </button>
                  <button className="button button-quiet" type="button" onClick={() => setTranscript("")} disabled={!transcript}>
                    Clear
                  </button>
                </div>
                <span className="privacy-note">Microphone access requires permission</span>
              </div>
            </div>

            <div className="form-footer">
              <p>Review your text before saving it to history.</p>
              <div className="footer-buttons">
                {editingId && <button className="button button-quiet" type="button" onClick={cancelEdit}>Cancel edit</button>}
                <button className="button button-primary save-button" type="submit">{editingId ? "Update transcription" : "Save transcription"} <span>↗</span></button>
              </div>
            </div>
          </form>
        </section>

        <section className="history-section">
          <div className="history-heading">
            <div>
              <p className="eyebrow">YOUR LIBRARY</p>
              <h3>Transcription history <span className="count-badge">{history.length}</span></h3>
            </div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search history…" aria-label="Search history" />
            </label>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">↗</div>
              <h4>{search ? "No matching transcriptions" : "Your history starts here"}</h4>
              <p>{search ? "Try another search term." : "Save your first transcription and it will appear here."}</p>
            </div>
          ) : (
            <div className="history-list">
              {filteredHistory.map((item) => (
                <article className="history-card" key={item.id}>
                  <div className="history-card-main">
                    <div className="history-card-meta">
                      <span className="language-tag">{item.language}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <h4>{item.title || "Untitled transcription"}</h4>
                    <p className="history-text">{item.text}</p>
                  </div>
                  <div className="history-card-actions">
                    <button type="button" onClick={() => copyText(item.text)} title="Copy text">Copy</button>
                    <button type="button" onClick={() => editTranscription(item)} title="Edit transcription">Edit</button>
                    <button type="button" className="delete-action" onClick={() => deleteTranscription(item.id)} title="Delete transcription">Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer className="page-footer">SPEECH TO TEXT STUDIO <span>·</span> BUILT WITH REACT, DJANGO & MYSQL</footer>
      </main>
    </div>
  );
}
