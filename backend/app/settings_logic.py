from decimal import Decimal
from fastapi import HTTPException
from .models import RestaurantSettings

def check_rate(db, rate):
    s = db.get(RestaurantSettings, 1)
    allowed = (s.gst_rates if s else "0,5,12,18,28").split(",")
    if Decimal(str(rate)) not in {Decimal(x) for x in allowed}:
        raise HTTPException(400, f"GST rate must be one of: {', '.join(allowed)}")
