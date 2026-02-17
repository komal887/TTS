import io
import json
import re
import os
import requests
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from decimal import Decimal, ROUND_HALF_UP
from openai import OpenAI

# ==============================
# CONFIG
# ==============================
ALLOCATION_FILE = "data_allocation_2025.json"
TAX_RATE_FILE = "tax_rate.json"

UTTI_SERVICE_BASE = "http://127.0.0.1:8001/slip"

matplotlib.rcParams["font.family"] = "DejaVu Sans"

# ==============================
# AI CLIENT (EXPLANATION ONLY)
# ==============================
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

AI_SYSTEM_PROMPT = """
You are an Indian tax assistant.
Explain tax concepts clearly and simply.
DO NOT calculate tax amounts.
DO NOT invent tax rates.
If the question is unclear, ask for clarification.
"""

def ai_explain(user_text: str) -> str:
    if not OPENROUTER_API_KEY:
        return "⚠️ AI explanation unavailable (API key not configured)."

    response = ai_client.chat.completions.create(
        model="mistralai/mistral-7b-instruct",
        messages=[
            {"role": "system", "content": AI_SYSTEM_PROMPT},
            {"role": "user", "content": user_text}
        ],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()

# ==============================
# UTILITIES
# ==============================
def money(v):
    d = Decimal(v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"₹{d:,.2f}"

def load_allocation():
    with open(ALLOCATION_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_tax_rates():
    with open(TAX_RATE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def extract_amount(text):
    m = re.search(r"(\d{1,3}(?:,\d{3})+|\d+)", text)
    return float(m.group().replace(",", "")) if m else None

def extract_state(text, states):
    for s in states:
        if s.lower() in text.lower():
            return s
    return None

def extract_utti(text):
    m = re.search(r"UTTI-[A-Z]+-\d{2}-[A-Z0-9]{6}", text.upper())
    return m.group() if m else None

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
# 🔑 HANDLE UTTI QUERY
# ==============================
def handle_utti_query(utti, allocation_data):
    try:
        resp = requests.get(f"{UTTI_SERVICE_BASE}/{utti}", timeout=5)
        if resp.status_code != 200:
            return None, "⚠️ Invalid UTTI or data not found."

        slip = resp.json()
        total_gst = float(slip.get("total_gst", 0))

        # ---------------- TEXT ----------------
        lines = [
            f"UTTI: {utti}",
            f"Invoice Number: {slip.get('invoice_number')}",
            f"Purchase Date: {slip.get('purchase_date')}",
            f"Purchase Time: {slip.get('purchase_time')}",
            "",
            "Items Purchased:"
        ]

        for it in slip.get("items", []):
            lines.append(
                f"- {it['name']} – {money(it['price'])} "
                f"(GST {it['gst_percent']}% = {money(it['gst_amount'])})"
            )

        lines.append("")
        lines.append(f"Total GST Paid: {money(total_gst)}")
        lines.append("")
        lines.append("GST Allocation:")

        allocation = allocate_to_ministries(allocation_data, total_gst)

        for a in allocation[:5]:
            lines.append(
                f"- {a['ministry']} ({a['percent']}%) → {money(a['amount'])}"
            )

        text_response = "\n".join(lines)

        # ---------------- CHART ----------------
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

    except Exception as e:
        return None, f"⚠️ Error processing UTTI: {e}"

    try:
        resp = requests.get(f"{UTTI_SERVICE_BASE}/{utti}", timeout=5)
        if resp.status_code != 200:
            return None, "⚠️ Invalid UTTI or data not found."

        slip = resp.json()
        total_gst = float(slip.get("total_gst", 0))

        lines = [
            f"UTTI: {utti}",
            f"Invoice Number: {slip.get('invoice_number')}",
            f"Purchase Date: {slip.get('purchase_date')}",
            f"Purchase Time: {slip.get('purchase_time')}",
            "",
            "Items Purchased:"
        ]

        for it in slip.get("items", []):
            lines.append(
                f"- {it['name']} – {money(it['price'])} "
                f"(GST {it['gst_percent']}% = {money(it['gst_amount'])})"
            )

        lines.append("")
        lines.append(f"Total GST Paid: {money(total_gst)}")
        lines.append("")
        lines.append("GST Allocation:")

        allocation = allocate_to_ministries(allocation_data, total_gst)
        for a in allocation[:3]:
            lines.append(
                f"- {a['ministry']} ({a['percent']}%) → {money(a['amount'])}"
            )

        return None, "\n".join(lines)

    except Exception as e:
        return None, f"⚠️ Error processing UTTI: {e}"

# ==============================
# TAX CALCULATION ENGINE
# ==============================
def calculate_components(amount, components, state_fees=None, state=None):
    breakdown = []
    total = 0

    for c in components:
        rate = c["rate_percent"]

        if rate == "state_specific" and state:
            rate = state_fees.get(state, {}).get(c["name"], 0)

        if rate == "state_specific_incentive":
            rate = 0

        if isinstance(rate, (int, float)):
            tax = amount * rate / 100
            breakdown.append({
                "name": c["name"],
                "rate": rate,
                "amount": money(tax)
            })
            total += tax

    return breakdown, total

# ==============================
# MAIN ENTRY
# ==============================
def smart_tax_flow(user_text):
    allocation_data = load_allocation()
    tax_data = load_tax_rates()
    categories = tax_data["categories"]

    # 1️⃣ UTTI FLOW
    utti = extract_utti(user_text)
    if utti:
        return handle_utti_query(utti, allocation_data)

    amount = extract_amount(user_text)
    state = extract_state(user_text, tax_data.get("state_fees", {}).keys())

    # 2️⃣ GOODS GST
    if amount:
        for sector, items in categories["Goods"].items():
            for product, variants in items.items():
                if product.lower() in user_text.lower():
                    for variant, rule in variants.items():
                        if "price_above" in rule and amount <= rule["price_above"]:
                            continue
                        if "price_below" in rule and amount >= rule["price_below"]:
                            continue

                        breakdown, total_tax = calculate_components(
                            amount,
                            rule["tax_components"],
                            tax_data.get("state_fees"),
                            state
                        )

                        lines = [
                            f"Product: {product} ({variant})",
                            f"Base Price: {money(amount)}",
                            ""
                        ]

                        for b in breakdown:
                            lines.append(
                                f"- {b['name']} ({b['rate']}%) → {b['amount']}"
                            )

                        lines.append("")
                        lines.append(f"Total Tax: {money(total_tax)}")
                        lines.append(f"Final Price: {money(amount + total_tax)}")
                        lines.append("")
                        lines.append(rule.get("notes", ""))

                        return None, "\n".join(lines)

    # 3️⃣ SERVICES GST
    for service, rule in categories["Services"].items():
        if service.replace("_", " ").lower() in user_text.lower():
            breakdown, total_tax = calculate_components(
                amount or 0,
                rule["tax_components"]
            )

            lines = [
                f"Service: {service.replace('_',' ')}",
                f"Base Amount: {money(amount or 0)}",
                ""
            ]

            for b in breakdown:
                lines.append(
                    f"- {b['name']} ({b['rate']}%) → {b['amount']}"
                )

            lines.append("")
            lines.append(f"Total Tax: {money(total_tax)}")
            lines.append(rule.get("notes", ""))

            return None, "\n".join(lines)

    # 4️⃣ INCOME TAX
    if "income" in user_text.lower() and amount:
        slabs = categories["IncomeTax"]["Individual"]
        remaining = amount
        tax = 0
        lines = [f"Annual Income: {money(amount)}", ""]

        for s in slabs:
            if amount > s["min"]:
                taxable = min(remaining, s["max"] - s["min"])
                slab_tax = taxable * s["rate"] / 100
                lines.append(
                    f"{s['min']}–{s['max']} @ {s['rate']}% → {money(slab_tax)}"
                )
                tax += slab_tax
                remaining -= taxable

        lines.append("")
        lines.append(f"Total Income Tax: {money(tax)}")

        return None, "\n".join(lines)

    # 5️⃣ AI EXPLANATION FALLBACK
    return None, ai_explain(user_text)

# ==============================
# CLI TEST
# ==============================
if __name__ == "__main__":
    while True:
        q = input("Query: ")
        _, r = smart_tax_flow(q)
        print("\n", r)
