import io
import json
import re
import requests
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from decimal import Decimal, ROUND_HALF_UP

# ==============================
# CONFIG
# ==============================
ALLOCATION_FILE = "data_allocation_2025.json"

# 🔥 IMPORTANT: THIS MUST MATCH ut ti_backend PORT
UTTI_SERVICE_BASE = "http://127.0.0.1:8001/slip"

matplotlib.rcParams["font.family"] = "DejaVu Sans"


# ==============================
# UTILITIES
# ==============================
def money(v):
    d = Decimal(v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"₹{d:,.2f}"


def load_data():
    with open(ALLOCATION_FILE, "r", encoding="utf-8") as f:
        allocation = json.load(f)
    return allocation, {}


# ==============================
# GST ALLOCATION
# ==============================
def allocate_to_ministries(allocation_data, tax_amount):
    result = []
    for m in allocation_data.get("ministries", []):
        pct = float(m.get("percentage_share", 0))
        amt = (pct / 100) * tax_amount
        result.append({
            "ministry": m.get("ministry", "Unknown"),
            "percent": pct,
            "amount": amt
        })
    return sorted(result, key=lambda x: x["amount"], reverse=True)


# ==============================
# 🔑 CORRECT UTTI EXTRACTION
# ==============================
def extract_utti(text: str):
    """
    Matches:
    UTTI-GST-26-OF324C
    UTTI-GST-25-A9F3KQ
    """
    match = re.search(
        r"UTTI-[A-Z]+-\d{2}-[A-Z0-9]{6}",
        text.upper()
    )
    return match.group() if match else None


# ==============================
# 🔑 HANDLE UTTI QUERY
# ==============================
def handle_utti_query(utti, allocation_data):
    try:
        # 🔥 CORRECT PORT + ENDPOINT
        resp = requests.get(f"{UTTI_SERVICE_BASE}/{utti}", timeout=5)

        if resp.status_code != 200:
            return None, "⚠️ Invalid UTTI or data not found."

        slip = resp.json()

        items = slip.get("items", [])
        total_gst = float(slip.get("total_gst", 0))
        date = slip.get("purchase_date", "Unknown")
        time = slip.get("purchase_time", "Unknown")

        # -------- TEXT RESPONSE --------
        lines = [
            f"UTTI: {utti}",
            f"Invoice Number: {slip.get('invoice_number')}",
            f"Purchase Date: {date}",
            f"Purchase Time: {time}",
            "",
            "Items Purchased:"
        ]

        for it in items:
            lines.append(
                f"- {it['name']} – {money(it['price'])} "
                f"(GST {it['gst_percent']}% = {money(it['gst_amount'])})"
            )

        lines.append("")
        lines.append(f"Total GST Paid: {money(total_gst)}")
        lines.append("")
        lines.append("Allocation of your GST:")

        allocation = allocate_to_ministries(allocation_data, total_gst)

        for i, a in enumerate(allocation[:3], start=1):
            lines.append(
                f"{i}. {a['ministry'].upper()} – "
                f"{a['percent']}% ({money(a['amount'])})"
            )

        text_response = "\n".join(lines)

        # -------- PIE CHART --------
        try:
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.pie(
                [a["amount"] for a in allocation[:6]],
                labels=[a["ministry"] for a in allocation[:6]],
                autopct="%1.1f%%",
                startangle=140
            )
            ax.set_title("GST Allocation Across Ministries")

            buf = io.BytesIO()
            plt.savefig(buf, format="png", bbox_inches="tight")
            buf.seek(0)
            plt.close(fig)

            return buf, text_response

        except Exception:
            return None, text_response

    except Exception as e:
        return None, f"⚠️ Error processing UTTI: {e}"


# ==============================
# MAIN ENTRY
# ==============================
def smart_tax_flow(user_text, allocation_data=None, tax_data=None):
    if allocation_data is None:
        allocation_data, _ = load_data()

    # 🔑 UTTI FLOW
    utti = extract_utti(user_text)
    if utti:
        return handle_utti_query(utti, allocation_data)

    return None, "⚠️ Please enter a valid UTTI (e.g. UTTI-GST-26-OF324C)"


# ==============================
# CLI TEST
# ==============================
if __name__ == "__main__":
    alloc, _ = load_data()
    while True:
        q = input("Query: ")
        _, r = smart_tax_flow(q, alloc)
        print("\n", r)
