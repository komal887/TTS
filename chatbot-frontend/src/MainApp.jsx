import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import App from "./App";           // your chatbot
import Signup from "./Signup";
import Login from "./Login";

export default function MainApp() {
  return (
    <BrowserRouter>
      {/* Small navbar for navigation */}
      <nav
        style={{
          background: "#f3f3f3",
          padding: "10px",
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          borderBottom: "1px solid #ddd",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>💬 Chatbot</Link>
        <Link to="/signup" style={{ textDecoration: "none" }}>📝 Signup</Link>
        <Link to="/login" style={{ textDecoration: "none" }}>🔑 Login</Link>
      </nav>

      {/* Define routes for pages */}
      <Routes>
        <Route path="/" element={<App />} />       {/* chatbot as home */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
