from .models import Recipe, InventoryItem, StockTransaction

def apply_recipes(db, lines, user, sign):
    """lines: [(product_id, qty)]. sign=-1 consumes stock for a sale, +1 restores it (cancellation).
    Stock may go negative: that means the physical count needs correcting, and the item shows as low."""
    for pid, qty in lines:
        r = db.query(Recipe).filter_by(product_id=pid).first()
        if not r: continue
        for ing in r.ingredients:
            inv = db.get(InventoryItem, ing.item_id)
            change = sign * ing.quantity * qty
            inv.quantity += change
            db.add(StockTransaction(item_id=inv.id, kind="consumption" if sign < 0 else "adjustment", change=change, user_id=user.id))
