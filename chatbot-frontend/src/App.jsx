import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Allocation from "./pages/Allocation";
import Comparison from "./pages/Comparison";
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
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* -----------------------------
   Layout Wrapper (IMPORTANT)
----------------------------- */
function AppLayout() {
  const location = useLocation();
  const isChatPage = location.pathname === "/chat";

  return (
    <>
      {/* Hide Navbar on Chat page */}
      {!isChatPage && <Navbar />}

      <main style={{ height: "100vh", overflow: "hidden" }}>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/ministry" element={<Ministry />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/comparison" element={<Comparison />} />
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      {/* Hide Footer on Chat page */}
      {!isChatPage && <Footer />}
    </>
  );
}

/* -----------------------------
   Main App
----------------------------- */
function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
