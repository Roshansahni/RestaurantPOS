from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    gst_rate: Decimal = Field(default=Decimal("5"), ge=0, le=28)
    available: bool = True
    category_id: int | None = None

class ProductOut(ProductIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_path: str | None = None

class ItemIn(BaseModel):
    product_id: int
    qty: int = Field(gt=0, le=100)

class OrderIn(BaseModel):
    order_type: Literal["dine_in", "takeaway", "online"]
    table_id: int | None = None
    items: list[ItemIn] = Field(min_length=1)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    interstate: bool = False
    customer_id: int | None = None
    priority: Literal["normal", "rush"] = "normal"

class StatusIn(BaseModel):
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"]

class PayIn(BaseModel):
    method: Literal["cash", "upi", "card", "other"]

class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    email: str = ""

class EmployeeIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=30)
    phone: str = ""
    active: bool = True

class SupplierIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = ""

class InventoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    unit: str = "kg"
    reorder_level: Decimal = Field(default=Decimal("0"), ge=0)
    supplier_id: int | None = None

class StockIn(BaseModel):
    kind: Literal["purchase", "consumption", "adjustment"]
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    cost: Decimal = Field(default=Decimal("0"), ge=0)
