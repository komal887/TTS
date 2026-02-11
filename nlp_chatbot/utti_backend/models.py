from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, time, datetime


# -------------------------------------------------
# ITEM MODEL (each product in the slip)
# -------------------------------------------------
class Item(BaseModel):
    name: str = Field(..., example="Laptop")
    price: float = Field(..., example=80000)
    gst_percent: float = Field(..., example=18)
    gst_amount: float = Field(..., example=14400)


# -------------------------------------------------
# PURCHASE SLIP INPUT MODEL (from frontend)
# -------------------------------------------------
class PurchaseSlipCreate(BaseModel):
    invoice_number: str = Field(..., example="INV-2025-001")
    purchase_date: date = Field(..., example="2025-02-10")
    purchase_time: time = Field(..., example="14:30")
    items: List[Item]


# -------------------------------------------------
# PURCHASE SLIP STORED MODEL (database schema)
# -------------------------------------------------
class PurchaseSlipDB(BaseModel):
    utti: str = Field(..., example="UTTI-GST-25-A9F3KQ")
    invoice_number: str
    purchase_date: date
    purchase_time: time
    items: List[Item]

    total_amount: float = Field(..., example=81000)
    total_gst: float = Field(..., example=14580)

    created_at: datetime = Field(default_factory=datetime.utcnow)


# -------------------------------------------------
# RESPONSE MODEL (after UTTI generation)
# -------------------------------------------------
class UTTIResponse(BaseModel):
    message: str = Field(..., example="UTTI generated successfully")
    utti: str = Field(..., example="UTTI-GST-25-A9F3KQ")
    total_items: int = Field(..., example=2)
    total_gst: float = Field(..., example=14580)
