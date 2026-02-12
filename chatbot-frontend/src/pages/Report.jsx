import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css";     // global navbar (must be first)
import "../styles/report.css";     // report-page styling ONLY

export default function Reports() {
  const navigate = useNavigate();

  return (
    <div className="report-page">

      {/* NAVBAR */}
      <header className="navbar">
        <div className="nav-left">
          <div className="nav-logo">
            <span className="nav-crest">₹</span>
            <h1 className="nav-title">Tax Transparency System</h1>
          </div>
        </div>

        {/* Menu button */}
        <button
          className="menu-toggle"
          onClick={() =>
            document.getElementById("navbarLinks")?.classList.toggle("active")
          }
        >
          <i className="fas fa-bars"></i>
        </button>

        {/* Nav links */}
        <nav className="navbar-links" id="navbarLinks">
          <Link to="/">Home</Link>
          <Link to="/allocation">Allocation</Link>
          <Link to="/calculation">Calculation</Link>
          <Link to="/report" className="active">Reports</Link>
          <Link to="/comparison">Comparison</Link>
        </nav>

        {/* Desktop Back Button */}
        <div className="nav-right">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i>
          </button>
        </div>
      </header>

      {/* Floating Mobile Back Button */}
      <button
        className="floating-back"
        onClick={() => navigate(-1)}
      >
        <i className="fas fa-arrow-left"></i>
      </button>

      {/* MAIN CONTENT */}
      <main className="report-main">
        <section className="report-header">
          <h1>Official Budget Reports</h1>
          <p>
            Access and verify official data from the Government of India for the Union Budget 2025–26.
          </p>
        </section>

        <section className="report-content">

          <div className="report-card">
            <h2>🔗 Union Budget Portal</h2>
            <p>The main Ministry of Finance website hosting all budget documents.</p>
            <a href="https://www.indiabudget.gov.in"
               className="btn" target="_blank" rel="noopener noreferrer">
              Visit Official Budget Website
            </a>
          </div>

          <div className="report-card">
            <h2>📘 Expenditure Profile (Volume I)</h2>
            <p>Overview of government spending, sectoral trends and allocations.</p>
            <a href="https://www.indiabudget.gov.in/doc/eb/vol1.pdf"
               className="btn" target="_blank" rel="noopener noreferrer">
              Open Expenditure Profile
            </a>
          </div>

          <div className="report-card">
            <h2>📊 Expenditure Budget (Volume II)</h2>
            <p>Detailed Demands for Grants for all ministries and departments.</p>
            <a href="https://www.indiabudget.gov.in/doc/eb/allsbe.pdf"
               className="btn" target="_blank" rel="noopener noreferrer">
              Open Expenditure Budget
            </a>
          </div>

          <div className="report-card">
            <h2>📄 Receipt Budget</h2>
            <p>Shows revenue receipts, tax collections and borrowing structure.</p>
            <a href="https://www.indiabudget.gov.in/doc/rec/allrec.pdf"
               className="btn" target="_blank" rel="noopener noreferrer">
              View Receipt Budget
            </a>
          </div>

        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <p>
            <strong>Tax Transparency System (TTS)</strong> — Enhancing visibility and accountability.
          </p>
          <p className="footer-links">
            <Link to="/report">Official Reports</Link> |
            <a href="https://www.indiabudget.gov.in" target="_blank" rel="noreferrer">
              Union Budget Portal
            </a> |
            <Link to="/about">About</Link> |
            <Link to="/contact">Contact</Link>
          </p>
          <small>
            © 2025 TTS. All data belongs to the Ministry of Finance, Government of India.
          </small>
        </div>
      </footer>

    </div>
  );
}
