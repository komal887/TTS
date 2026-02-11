import React, { useEffect, useState, useRef } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import Toast from "./Toast";
import SlipEntry from "./SlipEntry"; // ✅ NEW (added)
import { Download, Copy } from "lucide-react";
import "./App.css";

const STORAGE_KEY = "tts_chat_storage_v1";

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeChart, setActiveChart] = useState(null);
  const [reviewWidthPct, setReviewWidthPct] = useState(50);
  const [toast, setToast] = useState(null);

  // ✅ NEW STATE (added safely)
  const [viewMode, setViewMode] = useState("chat"); // "chat" | "slip"

  const dragRef = useRef(false);

  // ---------------- Load from localStorage ----------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const storedChats = parsed.chats || [];

        if (storedChats.length === 0) {
          const id = Date.now();
          const seed = { id, title: "New chat", messages: [] };
          setChats([seed]);
          setActiveChatId(id);
        } else {
          setChats(storedChats);
          setActiveChatId(parsed.activeChatId ?? storedChats[0]?.id ?? null);
        }

        setSidebarVisible(parsed.sidebarVisible ?? true);
        setReviewWidthPct(parsed.reviewWidthPct ?? 50);
      } else {
        const id = Date.now();
        const seed = { id, title: "New chat", messages: [] };
        setChats([seed]);
        setActiveChatId(id);
      }
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ---------------- Save to localStorage ----------------
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ chats, activeChatId, sidebarVisible, reviewWidthPct })
      );
    } catch {}
  }, [chats, activeChatId, sidebarVisible, reviewWidthPct]);

  // ---------------- Helpers ----------------
  const createChat = () => {
    const id = Date.now();
    const chat = { id, title: "New chat", messages: [] };
    setChats((s) => [chat, ...s]);
    setActiveChatId(id);
  };

  const appendToActive = (message) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...(c.messages || []), message] }
          : c
      )
    );
  };

  const updateActive = (patch) => {
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, ...patch } : c))
    );
  };

  const renameChat = (id, title) =>
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));

  const deleteChat = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
      return next;
    });
  };

  const openReviewWithChart = (chartUri) => {
    if (!chartUri) {
      setToast({ text: "No chart available", type: "error" });
      return;
    }
    setActiveChart(chartUri);
    setReviewOpen(true);
    setSidebarVisible(false);
  };

  const closeReview = () => {
    setReviewOpen(false);
    setActiveChart(null);
    setTimeout(() => setSidebarVisible(true), 200);
  };

  const copyActiveChat = async () => {
    const active = chats.find((c) => c.id === activeChatId);
    if (!active) return;

    const text = (active.messages || [])
      .map((m) => `${m.role === "user" ? "You" : "Bot"}: ${m.text}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setToast({ text: "Copied chat", type: "success" });
    } catch {
      setToast({ text: "Copy failed", type: "error" });
    }
  };

  const downloadChart = () => {
    if (!activeChart) return;
    const a = document.createElement("a");
    a.href = activeChart;
    a.download = "Tax_Chart.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  // ---------------- Draggable Resize ----------------
  const startDrag = () => (dragRef.current = true);

  const onDrag = (e) => {
    if (!dragRef.current) return;
    const pct = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (pct > 25 && pct < 75) setReviewWidthPct(pct);
  };

  const stopDrag = () => (dragRef.current = false);

  useEffect(() => {
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, []);

  // ---------------- UI ----------------
  return (
    <div className="app-root">

      {/* ✅ SIMPLE MODE TOGGLE (added safely) */}
      <div style={{ position: "fixed", top: 10, right: 20, zIndex: 1000 }}>
        <button
          onClick={() =>
            setViewMode(viewMode === "chat" ? "slip" : "chat")
          }
        >
          {viewMode === "chat" ? "Open Slip Entry" : "Back to Chatbot"}
        </button>
      </div>

      {viewMode === "slip" ? (
        <SlipEntry />
      ) : (
        <>
          {sidebarVisible && (
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onSelect={(id) => setActiveChatId(id)}
              onNew={createChat}
              onRename={(id, t) => renameChat(id, t)}
              onDelete={(id) => deleteChat(id)}
              toggle={() => setSidebarVisible((s) => !s)}
              isMobile={window.innerWidth <= 920}
            />
          )}

          <ChatArea
            chat={activeChat}
            append={(msg) => appendToActive(msg)}
            updateActive={(patch) => updateActive(patch)}
            openReview={(chartUri) => openReviewWithChart(chartUri)}
            setToast={setToast}
            toggleSidebar={() => setSidebarVisible((s) => !s)}
          />

          {/* ---------------- CHART REVIEW PANEL ---------------- */}
          {reviewOpen && (
            <>
              <div className="review-overlay" onClick={closeReview} />

              <div
                className="review-split preview-card"
                style={{ width: `${reviewWidthPct}%` }}
              >
                <div
                  className="review-handle"
                  onMouseDown={startDrag}
                  title="Resize panel"
                />

                <div className="review-panel-inner">
                  <div className="preview-header">
                    <h3>Chart Preview</h3>

                    <div className="preview-actions">
                      <button className="icon-btn" onClick={copyActiveChat}>
                        <Copy size={16} />
                      </button>

                      <button className="icon-btn" onClick={downloadChart}>
                        <Download size={16} />
                      </button>

                      <button
                        className="icon-btn close-btn"
                        onClick={closeReview}
                      >
                        ✖
                      </button>
                    </div>
                  </div>

                  <div className="preview-body">
                    {activeChart ? (
                      <img
                        src={activeChart}
                        className="preview-img"
                        alt="chart"
                      />
                    ) : (
                      <div className="preview-empty">
                        No chart available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <Toast toast={toast} onClose={() => setToast(null)} />
        </>
      )}
    </div>
  );
}
