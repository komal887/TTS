from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    PurchaseSlipCreate,
    PurchaseSlipDB,
    UTTIResponse
)
from utti_generator import (
    generate_utti,
    calculate_item_gst,
    calculate_totals
)
from database import (
    insert_purchase_slip,
    get_slip_by_utti,
    utti_exists
)

app = FastAPI(title="UTTI Slip Generation Service")

# -------------------------------------------------
# CORS (frontend safe)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------
@app.get("/")
def root():
    return {"message": "UTTI Backend Service is running"}

# -------------------------------------------------
# CREATE SLIP & GENERATE UTTI
# -------------------------------------------------
@app.post("/create-slip", response_model=UTTIResponse)
def create_purchase_slip(payload: PurchaseSlipCreate):
    """
    Accepts purchase slip data from frontend,
    generates UTTI, calculates GST, stores in DB,
    and returns UTTI.
    """

    # Calculate GST per item
    processed_items = []
    for item in payload.items:
        gst_amount = calculate_item_gst(item.price, item.gst_percent)
        item.gst_amount = gst_amount
        processed_items.append(item)

    # Calculate totals
    total_amount, total_gst = calculate_totals(processed_items)

    # Generate unique UTTI
    utti = generate_utti("GST")

    # Ensure uniqueness (very rare but safe)
    while utti_exists(utti):
        utti = generate_utti("GST")

    # Build DB object
    slip_record = PurchaseSlipDB(
        utti=utti,
        invoice_number=payload.invoice_number,
        purchase_date=payload.purchase_date,
        purchase_time=payload.purchase_time,
        items=processed_items,
        total_amount=total_amount,
        total_gst=total_gst
    )

    # Insert into database
    insert_purchase_slip(slip_record.dict())

    return UTTIResponse(
        message="UTTI generated successfully",
        utti=utti,
        total_items=len(processed_items),
        total_gst=total_gst
    )

# -------------------------------------------------
# FETCH SLIP BY UTTI (for chatbot usage)
# -------------------------------------------------
@app.get("/slip/{utti}")
def fetch_slip_by_utti(utti: str):
    """
    Fetch stored slip data using UTTI.
    This endpoint will be used by chatbot later.
    """

    slip = get_slip_by_utti(utti)
    if not slip:
        raise HTTPException(status_code=404, detail="UTTI not found")

    return slip
