import { Link } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>
          <strong>Tax Transparency System (TTS)</strong> — A citizen initiative for transparent public finance.
        </p>

        <p className="footer-links">
          <Link to="/report">Official Reports</Link> |{" "}
          <a
            href="https://www.indiabudget.gov.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            Union Budget Portal
          </a>{" "}
          | <Link to="/about">About</Link> | <Link to="/contact">Contact</Link>
        </p>

        <small>
          © 2025 Tax Transparency System | Government of India Data Sources
        </small>
      </div>
    </footer>
  );
}
