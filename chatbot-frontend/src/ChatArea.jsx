import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Copy } from "lucide-react";

export default function ChatArea({ chat, append, updateActive, openReview, setToast, toggleSidebar }) {
  const [text, setText] = useState("");
  const [hoverIndex, setHoverIndex] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat?.messages]);

  if (!chat) return <div className="empty-main" />;

 const send = async () => {
  const m = text.trim();
  if (!m) return;

  // snapshot whether this chat had zero messages BEFORE we append
  const hadNoMessagesBefore = !chat.messages || chat.messages.length === 0;
  const wasDefaultTitle = chat.title === "New chat" || chat.title.trim() === "";

  // prepare user message and append immediately (UI shows it)
  const user = { role: "user", text: m };
  append(user);
  setText("");

  // Smart Auto-Rename: only try when this was an empty/new chat
  try {
    if (hadNoMessagesBefore && wasDefaultTitle && typeof updateActive === "function") {
      // Clean the message
      const cleanMsg = m.trim().replace(/\s+/g, " ");
      // Skip common greetings for renaming (but DO NOT stop sending)
      const skipWords = ["hi", "hello", "hey", "hii", "yo", "hola"];
      const firstWord = (cleanMsg.split(" ")[0] || "").toLowerCase();

      if (!skipWords.includes(firstWord)) {
        // Capitalize and trim to ~25 chars
        const cap = cleanMsg.charAt(0).toUpperCase() + cleanMsg.slice(1);
        const titleCandidate = cap.length > 25 ? cap.slice(0, 25).trim() + "..." : cap.trim();
        updateActive({ title: titleCandidate });
      }
    }
  } catch (err) {
    console.error("Auto-rename error:", err);
    // continue anyway
  }

  // continue to get bot reply
  try {
    const res = await axios.post("http://127.0.0.1:8000/api/chat", { message: m });
    const { summary, chart } = res.data;
    const chartUri = chart ? (chart.startsWith("data:") ? chart : `data:image/png;base64,${chart}`) : null;
    const bot = { role: "bot", text: summary, chart: chartUri };
    append(bot);
  } catch (err) {
    console.error("API error", err);
    append({ role: "bot", text: "⚠️ Could not connect to server." });
    setToast && setToast({ text: "Server error", type: "error" });
  }
};


  const copyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg);
      setToast && setToast({ text: "Copied message", type: "success" });
    } catch {
      setToast && setToast({ text: "Copy failed", type: "error" });
    }
  };

  return (
    <main className="chat-area">
      <header className="chat-top">
        <div className="left">
          <button className="sidebar-toggle" onClick={toggleSidebar} title="Show/Hide sidebar">☰</button>
          <div className="brand"><span className="tts">TTS</span></div>
        </div>
      </header>

      <section className="chat-messages">
        {(!chat.messages || chat.messages.length === 0) ? (
          <div className="empty-state"><h1>Where should we begin?</h1></div>
        ) : (
          chat.messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role === "user" ? "user" : "bot"}`}
              onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <div className="avatar">{m.role === "user" ? "YOU" : "🤖"}</div>

              <div className="bubble">
                <div className="msg-text" style={{ whiteSpace: "pre-line" }}>{m.text}</div>

                {m.role === "bot" && hoverIndex === i && (
                  <button className="bubble-copy" onClick={() => copyMessage(m.text)} title="Copy message">
                    <Copy size={14} />
                  </button>
                )}

                {m.role === "bot" && m.chart && (
                  <div className="view-chart-line">
                    <button className="view-chart-inline" onClick={() => openReview(m.chart)}>View Chart</button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </section>

      <footer className="composer">
        <textarea
          rows={1}
          value={text}
          placeholder="Send a message..."
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="chat-textarea"
        />
        <button className="send" onClick={send}>➤</button>
      </footer>
    </main>
  );
}
