// src/pages/Allocation.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { jsPDF } from "jspdf";

import "../styles/allocation.css";
import "../styles/home.css";
import "../styles/navbar.css";

const DATA_PATH = "/data/output_json_improved_full/all_demands_improved_full.json";
const PER_DEMAND_PATH_PREFIX = "/data/output_json_improved_full/DEMAND_";

const TOP_MINISTRIES = [
  "defence","road transport","railway","education","health",
  "home affairs","rural development","agriculture","finance","housing and urban"
];

export default function Allocation() {
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const chartInstance = useRef(null);
  const dropdownRef = useRef(null);
  const downloadBtnRef = useRef(null);

  const [rawData, setRawData] = useState([]);
  const [levels, setLevels] = useState({ 1: [], 2: [], 3: [] });

  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelTitle, setLevelTitle] = useState("Level 1 — Most Important Demands");
  const [labels, setLabels] = useState([]);
  const [values, setValues] = useState([]);
  const [colors, setColors] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ---------------- Load data ----------------
  useEffect(() => {
    (async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(DATA_PATH);
        if (res.ok) {
          setRawData(await res.json());
        } else {
          const arr = [];
          for (let i = 1; i <= 120; i++) {
            try {
              const r = await fetch(`${PER_DEMAND_PATH_PREFIX}${i}.json`);
              if (r.ok) arr.push(await r.json());
            } catch {}
          }
          setRawData(arr);
        }
      } catch {
        setRawData([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ---------------- Dropdown close ----------------
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current?.contains(e.target) ||
        downloadBtnRef.current?.contains(e.target)
      ) return;
      setDropdownOpen(false);
    }

    function handleEsc(e) {
      if (e.key === "Escape") setDropdownOpen(false);
    }

    function handleScroll() {
      setDropdownOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // ---------------- Normalize & classify ----------------
  useEffect(() => {
    if (!rawData.length) return;

    const map = new Map();
    rawData.forEach((d) => {
      const name =
        d.ministry || d.ministry_name || d["Ministry/Demand Revenue Capital Total Page No"];
      const ministry = normalize(name);
      const total = getValue(d.values) || getFromSections(d.sections) || 0;
      map.set(ministry, (map.get(ministry) || 0) + total);
    });

    const all = [...map.entries()]
      .map(([ministry, total]) => ({ ministry, total }))
      .sort((a, b) => b.total - a.total);

    const level1 = all.filter((d) =>
      TOP_MINISTRIES.some((k) => normalize(d.ministry).includes(k))
    );

    const rem = all.filter(
      (d) => !TOP_MINISTRIES.some((k) => normalize(d.ministry).includes(k))
    );

    const mid = Math.ceil(rem.length * 0.5);
    setLevels({ 1: level1, 2: rem.slice(0, mid), 3: rem.slice(mid) });

    renderForLevel(1, { 1: level1, 2: rem.slice(0, mid), 3: rem.slice(mid) });
  }, [rawData]);

  // ---------------- Chart render ----------------
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = canvasRef.current.getContext("2d");

    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 10,
          },
        ],
      },
      options: {
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { display: false },
      },

      // ⭐ ADD THIS BLOCK BACK
      onClick: (evt, elements) => {
        if (elements && elements.length > 0) {
          const idx = elements[0].index;
          const selectedMinistry = labels[idx];
          navigate(`/ministry?name=${encodeURIComponent(selectedMinistry)}`);
        }
      },
    },

      
    });

    return () => chartInstance.current?.destroy();
  }, [labels, values, colors]);

  // ---------------- Helpers ----------------
  const normalize = (n) =>
    n?.toString()?.toLowerCase()?.replace(/\(.*?\)/g, "")?.trim() || "unknown";

  const titleCase = (str) =>
    str?.replace(/\b\w/g, (ch) => ch.toUpperCase()) || "";

  function getValue(values) {
    if (!values) return null;
    for (const k of [
      "total_2025_26",
      "budget_2025_26",
      "total_2024_25",
      "budget_2024_25",
    ]) {
      if (values[k] !== undefined && !isNaN(values[k])) return +values[k];
    }
    return null;
  }

  function getFromSections(sections) {
    if (!sections) return null;
    for (const s of sections)
      for (const it of s.items || [])
        if (/total|grand|net/i.test(it.name || ""))
          return getValue(it.values);
    return null;
  }

  const generateColors = (n) =>
    Array.from({ length: n }, (_, i) => `hsl(${(i * 35) % 360},75%,55%)`);

  function renderForLevel(level, LS = levels) {
    const arr = LS[level] || [];
    setLabels(arr.map((d) => titleCase(d.ministry)));
    setValues(arr.map((d) => d.total));
    setColors(generateColors(arr.length));

    setLevelTitle(
      level === 1
        ? "Level 1 — Top 10 Ministries by Expenditure"
        : level === 2
        ? "Level 2 — Medium-Scale Ministries"
        : "Level 3 — Smaller Allocations"
    );

    setCurrentLevel(level);
  }

  // ---------------- EXPORT FIXED VERSION ----------------
  async function downloadChart(format = "png") {
    try {
      if (!canvasRef.current || !chartInstance.current) return;

      setDropdownOpen(false);
      await new Promise((r) => setTimeout(r, 150));

      const exportW = 1300;
      const exportH = 900;
      const headerH = 120;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const ctx = exportCanvas.getContext("2d");

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, exportW, exportH);

      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      ctx.fillStyle = "#004aad";
      ctx.font = "bold 30px Inter";
      ctx.fillText("Tax Transparency System — Allocation Report", 40, 50);

      ctx.fillStyle = "#0b4f6c";
      ctx.font = "600 20px Inter";
      ctx.fillText(levelTitle, 40, 90);

      ctx.fillStyle = "#475569";
      ctx.font = "16px Inter";
      ctx.fillText(`Fiscal Year: 2025–26`, 40, 118);
      ctx.fillText(`Generated on: ${dateStr}`, 260, 118);

      // insert chart
      const img = new Image();
      img.src = canvasRef.current.toDataURL("image/png");
      img.onload = () => {
        ctx.drawImage(img, 40, headerH, 600, 600);

        drawLegend();
        finalize();
      };

      const drawLegend = () => {
        const L = chartInstance.current.data.labels;
        const V = chartInstance.current.data.datasets[0].data;
        const C = chartInstance.current.data.datasets[0].backgroundColor;
        const total = V.reduce((a, b) => a + b, 0);

        ctx.fillStyle = "#004aad";
        ctx.font = "bold 20px Inter";
        ctx.fillText("Top Allocations", 700, 160);

        let y = 210;
        const cap = Math.min(L.length, 12);
        for (let i = 0; i < cap; i++) {
          ctx.fillStyle = C[i];
          ctx.fillRect(700, y - 12, 14, 14);

          ctx.fillStyle = "#0b4f6c";
          ctx.font = "16px Inter";
          ctx.fillText(L[i], 720, y);

          ctx.fillStyle = "#64748b";
          ctx.font = "14px Inter";
          ctx.fillText(`₹${V[i].toLocaleString()} • ${((V[i]/total)*100).toFixed(2)}%`, 720, y + 18);

          y += 40;
        }
      };

      function finalize() {
        const file = `Allocation_${levelTitle.replace(/\s+/g, "_")}_${dateStr}`;

        // PNG
        if (format === "png") {
          const link = document.createElement("a");
          link.download = `${file}.png`;
          link.href = exportCanvas.toDataURL("image/png");
          document.body.appendChild(link);
          link.click();
          link.remove();
          return;
        }

        // PDF
        if (format === "pdf") {
          const pdf = new jsPDF("l", "mm", "a3");
          pdf.addImage(exportCanvas.toDataURL("image/png"), "PNG", 0, 0, 420, 297);
          pdf.save(`${file}.pdf`);
          return;
        }

        // SVG
        if (format === "svg") {
          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${exportW}" height="${exportH}">
              <image href="${exportCanvas.toDataURL("image/png")}" width="1300" height="900"/>
            </svg>`;

          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.download = `${file}.svg`;
          link.href = url;
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(url);
          }, 250);
        }
      }
    } catch (e) {
      console.error("export error:", e);
    }
  }

  // ---------------- Legend ----------------
  function Legend() {
    const total = values.reduce((a, b) => a + b, 0);
    return (
      <div className="sticky-legend">
        {labels.map((lbl, i) => (
          <div className="legend-item" key={i}>
            <span className="legend-swatch" style={{ background: colors[i] }} />
            <div className="legend-text">
              <div className="legend-title">{lbl}</div>
              <div className="legend-sub">
                ₹{values[i].toLocaleString()} • {((values[i] / total) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="allocation-wrapper">
      <header className="navbar">
        <div className="nav-left">
          <div className="nav-logo">
            <span className="nav-crest">₹</span>
            <h1 className="nav-title">Tax Transparency System</h1>
          </div>
        </div>

        <button
          className="menu-toggle"
          aria-label="Toggle Menu"
          onClick={() => {
            const el = document.getElementById("navbarLinks");
            el?.classList.toggle("active");
          }}
        >
          <i className="fas fa-bars"></i>
        </button>

        <nav className="navbar-links" id="navbarLinks">
          <Link to="/">Home</Link>
          <Link to="/allocation" className="active">Allocation</Link>
          <Link to="/calculation">Calculation</Link>
          <Link to="/report">Reports</Link>
          <Link to="/comparison">Comparison</Link>
        </nav>

        <div className="nav-right">
          <button className="back-btn" onClick={() => navigate(-1)} title="Go Back">
            <i className="fas fa-arrow-left"></i>
          </button>
        </div>
      </header>

      <main className="main">
        <section className="viz-container">
          <div className="chart-section">
            <div className="chart-header">
              <h2 id="levelTitle">{levelTitle}</h2>

              <div className="download-menu" ref={downloadBtnRef}>
                <button
                  type="button"
                  className="download-chart-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen((s) => !s);
                  }}
                >
                  <i className="fas fa-download"></i> Download
                  <i className="fas fa-chevron-down"></i>
                </button>

                <div
                  className={`dropdown-options ${dropdownOpen ? "show" : ""}`}
                  ref={dropdownRef}
                >
                  <button type="button" onClick={() => downloadChart("png")}>
                    <i className="fas fa-image"></i> PNG
                  </button>
                  <button type="button" onClick={() => downloadChart("pdf")}>
                    <i className="fas fa-file-pdf"></i> PDF
                  </button>
                  <button type="button" onClick={() => downloadChart("svg")}>
                    <i className="fas fa-draw-polygon"></i> SVG
                  </button>
                </div>
              </div>
            </div>

            <div className="chart-area-wrapper">
              {isLoading ? (
                <div style={{ padding: 40 }}>Loading data...</div>
              ) : (
                <>
                  <canvas id="mainChart" ref={canvasRef} />
                  <Legend />
                </>
              )}
            </div>
          </div>

          <aside className="level-selector">
            <h3>Select Level</h3>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                className={`level-btn ${lvl === currentLevel ? "active" : ""}`}
                onClick={() => renderForLevel(lvl)}
              >
                Level {lvl}
              </button>
            ))}
          </aside>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>
            <strong>Tax Transparency System (TTS)</strong> — A citizen initiative for budget visibility and accountability.
          </p>

          <p className="footer-links">
            <Link to="/report">Official Reports</Link> |
            <a href="https://www.indiabudget.gov.in" target="_blank" rel="noreferrer">
              Union Budget Portal
            </a> | <Link to="/about">About</Link> | <Link to="/contact">Contact</Link>
          </p>

          <small>© 2025 Tax Transparency System. All data sources belong to the Ministry of Finance.</small>
        </div>
      </footer>
    </div>
  );
}
