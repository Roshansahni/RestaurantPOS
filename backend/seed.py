"""Dev-only demo data. Passwords come from SEED_PASSWORD env var (not stored in code)."""
import os, sys
from app.db import SessionLocal, Base, engine
from app.models import *
from app.security import hash_pw

pw = os.environ.get("SEED_PASSWORD")
if not pw or len(pw) < 8: sys.exit("Set SEED_PASSWORD (min 8 chars): SEED_PASSWORD=... python seed.py")
Base.metadata.create_all(engine)
db = SessionLocal()
if not db.query(User).first():
    for n, r in [("admin","admin"),("manager","manager"),("cashier1","cashier"),("cashier2","cashier"),("kitchen1","kitchen"),("kitchen2","kitchen")]:
        db.add(User(username=n, full_name=n.title(), role=r, password_hash=hash_pw(pw)))
    cats = [Category(name=c) for c in ["Starters","Soups","Main Course","Breads","Rice","Desserts","Beverages","Tandoor","Chinese","Snacks"]]
    db.add_all(cats); db.flush()
    for i, c in enumerate(cats):
        for j in range(4):
            db.add(Product(name=f"{c.name} Item {j+1}", price=80 + 20*i + 15*j, gst_rate=5, category_id=c.id))
    db.add_all([RestaurantTable(label=f"T{i}", seats=4) for i in range(1, 11)])
    sup = Supplier(name='Fresh Farms'); db.add(sup); db.flush()
    for n, u, q, lv in [('Rice','kg',50,10),('Paneer','kg',4,5),('Cooking Oil','l',20,8),('Tomato','kg',12,6)]:
        db.add(InventoryItem(name=n, unit=u, quantity=q, reorder_level=lv, supplier_id=sup.id))
    db.add_all([Customer(name='Asha Verma', phone='9876500001'), Customer(name='Rohit Jain', phone='9876500002')])
    db.add_all([Employee(name='Ravi Kumar', role='chef'), Employee(name='Meena Rao', role='cashier')])
    db.commit()
print("Seeded.")
