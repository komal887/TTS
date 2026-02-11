import uuid
from datetime import datetime


# -------------------------------------------------
# UTTI GENERATION LOGIC
# -------------------------------------------------
def generate_utti(tax_type: str = "GST") -> str:
    """
    Generates a unique Universal Tax Trace Identifier (UTTI)

    Format:
    UTTI-<TAX_TYPE>-<YY>-<RANDOM>

    Example:
    UTTI-GST-25-A9F3KQ
    """

    year = datetime.utcnow().strftime("%y")
    random_part = uuid.uuid4().hex[:6].upper()

    return f"UTTI-{tax_type}-{year}-{random_part}"


# -------------------------------------------------
# TAX CALCULATION HELPERS
# -------------------------------------------------
def calculate_item_gst(price: float, gst_percent: float) -> float:
    """
    Calculates GST amount for a single item
    """
    price = float(price or 0)
    gst_percent = float(gst_percent or 0)

    return round((price * gst_percent) / 100, 2)


def calculate_totals(items: list) -> tuple:
    """
    Calculates total amount and total GST from item list

    items: list of Item models (from models.py)
    """

    total_amount = 0.0
    total_gst = 0.0

    for item in items:
        price = float(item.price or 0)
        gst_amount = float(item.gst_amount or 0)

        total_amount += price
        total_gst += gst_amount

    return round(total_amount, 2), round(total_gst, 2)
