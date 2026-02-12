import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Allocation from "./pages/Allocation";
import Ministry from "./pages/Ministry";
import ChatApp from "./ChatApp";
import Projects from "./pages/Projects";
import Report from "./pages/Report";
import Signup from "./Signup";
import Login from "./Login";

/* -----------------------------
   Protected Route Component
----------------------------- */
function ProtectedRoute({ children }) {
  const user = localStorage.getItem("userEmail");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <main style={{ minHeight: "100vh" }}>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/ministry" element={<Ministry />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/report" element={<Report />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Route */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatApp />
              </ProtectedRoute>
            }
          />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
