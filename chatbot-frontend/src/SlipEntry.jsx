import { useState } from "react";
import axios from "axios";
import "./SlipEntry.css";

/* -----------------------------------------
   Helper: normalize time to 24-hour HH:MM
------------------------------------------ */
const normalizeTime = (timeStr) => {
  if (!timeStr) return "";

  // Handles formats like "06:08 PM"
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":");

    if (modifier === "PM" && hours !== "12") {
      hours = String(Number(hours) + 12);
    }
    if (modifier === "AM" && hours === "12") {
      hours = "00";
    }

    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  // Already in HH:MM
  return timeStr;
};

function SlipEntry() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseTime, setPurchaseTime] = useState("");

  const [items, setItems] = useState([
    { name: "", price: "", gst_percent: "" }
  ]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---------------- Item Handlers ---------------- */

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: "", price: "", gst_percent: "" }]);
  };

  /* ---------------- Submit Slip ---------------- */

  const submitSlip = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Basic validation
      if (!invoiceNumber || !purchaseDate || !purchaseTime) {
        alert("Please fill all slip details.");
        return;
      }

      if (items.length === 0) {
        alert("Add at least one item.");
        return;
      }

      const payload = {
        invoice_number: invoiceNumber.trim(),
        purchase_date: purchaseDate,
        purchase_time: normalizeTime(purchaseTime),
        items: items.map((item) => ({
          name: item.name.trim(),
          price: Number(item.price),
          gst_percent: Number(item.gst_percent),
          gst_amount: 0
        }))
      };

      // ✅ IMPORTANT FIX: correct backend port
      const res = await axios.post(
        "http://localhost:8001/create-slip",
        payload
      );

      setResult(res.data);
    } catch (err) {
      console.error("❌ Backend error:", err.response?.data || err);
      alert("Failed to generate UTTI");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="slip-container">
      <h2>UTTI Slip Entry</h2>

      <form onSubmit={submitSlip}>
        <input
          className="slip-input"
          placeholder="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          required
        />

        <input
          className="slip-input"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          required
        />

        <input
          className="slip-input"
          type="time"
          value={purchaseTime}
          onChange={(e) => setPurchaseTime(e.target.value)}
          required
        />

        <h3>Items</h3>

        {items.map((item, index) => (
          <div key={index} className="item-row">
            <input
              className="slip-input"
              placeholder="Item Name"
              value={item.name}
              onChange={(e) =>
                handleItemChange(index, "name", e.target.value)
              }
              required
            />

            <input
              className="slip-input"
              type="number"
              placeholder="Price"
              min="0"
              value={item.price}
              onChange={(e) =>
                handleItemChange(index, "price", e.target.value)
              }
              required
            />

            <input
              className="slip-input"
              type="number"
              placeholder="GST %"
              min="0"
              value={item.gst_percent}
              onChange={(e) =>
                handleItemChange(index, "gst_percent", e.target.value)
              }
              required
            />
          </div>
        ))}

        <button
          type="button"
          className="secondary-btn"
          onClick={addItem}
        >
          + Add Item
        </button>

        <br /><br />

        <button
          type="submit"
          className="primary-btn"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate UTTI"}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <h3>UTTI Generated ✅</h3>
          <p><b>UTTI:</b> {result.utti}</p>
          <p><b>Total Items:</b> {result.total_items}</p>
          <p><b>Total GST:</b> ₹{result.total_gst}</p>

          <button
            className="copy-btn"
            onClick={() => navigator.clipboard.writeText(result.utti)}
          >
            Copy UTTI
          </button>
        </div>
      )}
    </div>
  );
}

export default SlipEntry;
