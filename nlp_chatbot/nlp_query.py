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
# AI (SAFE – LAZY INIT)
# ==============================
AI_SYSTEM_PROMPT = """
You are an Indian tax assistant.
Explain tax concepts clearly and simply.
DO NOT calculate tax amounts.
DO NOT invent tax rates.
"""

def ai_explain(user_text: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return "⚠️ AI explanation unavailable (API key not configured)."

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )

    response = client.chat.completions.create(
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
# CHART GENERATORS
# ==============================
def generate_tax_component_chart(breakdown, title):
    values = []
    labels = []

    for b in breakdown:
        amt = float(b["amount"].replace("₹", "").replace(",", ""))
        if amt > 0:
            values.append(amt)
            labels.append(b["name"])

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.pie(values, labels=labels, autopct="%1.1f%%", startangle=140)
    ax.set_title(title)

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    plt.close(fig)

    return buf

# ==============================
# GST ALLOCATION
# ==============================
def allocate_to_ministries(allocation_data, tax_amount):
    result = []
    for m in allocation_data.get("ministries", []):
        pct = float(m.get("percentage_share", 0))
        result.append({
            "ministry": m["ministry"],
            "percent": pct,
            "amount": tax_amount * pct / 100
        })
    return sorted(result, key=lambda x: x["amount"], reverse=True)

# ==============================
# UTTI HANDLER (WITH CHART)
# ==============================
def handle_utti_query(utti, allocation_data):
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
    for a in allocation[:5]:
        lines.append(
            f"- {a['ministry']} ({a['percent']}%) → {money(a['amount'])}"
        )

    chart_buf = generate_tax_component_chart(
        [{"name": a["ministry"], "amount": money(a["amount"])} for a in allocation[:6]],
        "GST Allocation Across Ministries"
    )

    return chart_buf, "\n".join(lines)

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

    # 1️⃣ UTTI
    utti = extract_utti(user_text)
    if utti:
        return handle_utti_query(utti, allocation_data)

    amount = extract_amount(user_text)
    state = extract_state(user_text, tax_data.get("state_fees", {}).keys())

    # 2️⃣ GOODS GST (WITH CHART)
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

                        chart_buf = generate_tax_component_chart(
                            breakdown,
                            f"{product} ({variant}) Tax Breakdown"
                        )

                        return chart_buf, "\n".join(lines)

    # 3️⃣ AI FALLBACK
    return None, ai_explain(user_text)

# ==============================
# CLI TEST
# ==============================
if __name__ == "__main__":
    while True:
        q = input("Query: ")
        chart, text = smart_tax_flow(q)
        print("\n", text)
