import React, { useState } from "react";
import { Plus, Edit2, Trash2, MoreVertical, X } from "lucide-react";

export default function Sidebar({
  chats = [],
  activeChatId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  toggle,
  isMobile = false,
}) {
  const [menuOpen, setMenuOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [temp, setTemp] = useState("");

  // ✅ Get username from localStorage
  const username = localStorage.getItem("username") || "User";

  const avatarLetter = username.charAt(0).toUpperCase();

  const openMenuFor = (id) =>
    setMenuOpen((p) => (p === id ? null : id));

  const startEdit = (id, title) => {
    setEditing(id);
    setTemp(title);
    setMenuOpen(null);
  };

  return (
    <aside className={`sidebar-panel ${isMobile ? "mobile" : ""}`}>
      <div className="sidebar-header">
        <button className="new-chat" onClick={onNew}>
          <Plus size={14} /> New chat
        </button>

        <button className="close-sidebar" onClick={toggle}>
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-list">
        {chats.map((c) => {
          const active = c.id === activeChatId;

          return (
            <div
              key={c.id}
              className={`sidebar-item ${active ? "active" : ""}`}
              onClick={() => {
                onSelect(c.id);
                if (isMobile) toggle();
              }}
            >
              <div className="left">
                <div className="dot" />

                {editing === c.id ? (
                  <input
                    className="rename-input"
                    autoFocus
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    onBlur={() => {
                      onRename(c.id, temp || "New chat");
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRename(c.id, temp || "New chat");
                        setEditing(null);
                      }
                    }}
                  />
                ) : (
                  <div className="title">{c.title}</div>
                )}
              </div>

              <div
                className="right"
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative" }}
              >
                <button
                  className="icon"
                  onClick={() => openMenuFor(c.id)}
                  title="More options"
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen === c.id && (
                  <div className="menu-pop fade-in">
                    <button
                      className="menu-item"
                      onClick={() => startEdit(c.id, c.title)}
                    >
                      <Edit2 size={14} /> Rename
                    </button>

                    <button
                      className="menu-item"
                      onClick={() => {
                        if (window.confirm("Delete this chat?"))
                          onDelete(c.id);
                        setMenuOpen(null);
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* USER FOOTER */}
      <div className="sidebar-footer">
        <div className="avatar">{avatarLetter}</div>
        <div className="acct">
          <div className="name">{username}</div>
          <div className="sub">Logged In</div>
        </div>
      </div>
    </aside>
  );
}
