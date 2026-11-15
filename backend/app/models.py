from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

M = lambda: Numeric(12, 2)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20))  # admin|manager|cashier|kitchen
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    description: Mapped[str] = mapped_column(String(500), default="")
    price: Mapped[Decimal] = mapped_column(M())
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), index=True)
    image_path: Mapped[str | None] = mapped_column(String(200))

class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"
    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(20), unique=True)
    seats: Mapped[int] = mapped_column(Integer, default=4)
    status: Mapped[str] = mapped_column(String(20), default="available")

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_type: Mapped[str] = mapped_column(String(20))  # dine_in|takeaway|online
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    table_id: Mapped[int | None] = mapped_column(ForeignKey("restaurant_tables.id"))
    subtotal: Mapped[Decimal] = mapped_column(M())
    discount: Mapped[Decimal] = mapped_column(M(), default=0)
    cgst: Mapped[Decimal] = mapped_column(M(), default=0)
    sgst: Mapped[Decimal] = mapped_column(M(), default=0)
    igst: Mapped[Decimal] = mapped_column(M(), default=0)
    total: Mapped[Decimal] = mapped_column(M())
    paid: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[str] = mapped_column(String(10), default="normal", server_default="normal")
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    items: Mapped[list["OrderItem"]] = relationship(cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    name: Mapped[str] = mapped_column(String(120))
    qty: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(M())
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))

class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    method: Mapped[str] = mapped_column(String(20))  # cash|upi|card|other (simulated)
    amount: Mapped[Decimal] = mapped_column(M())
    status: Mapped[str] = mapped_column(String(20), default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(30), unique=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    detail: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    email: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Supplier(Base):
    __tablename__ = "suppliers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    phone: Mapped[str] = mapped_column(String(20), default="")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    unit: Mapped[str] = mapped_column(String(10), default="kg")
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    reorder_level: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=0)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"))

class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # purchase|consumption|adjustment
    change: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    cost: Mapped[Decimal] = mapped_column(M(), default=0)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(30))
    phone: Mapped[str] = mapped_column(String(20), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Attendance(Base):
    __tablename__ = "attendance"
    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    day: Mapped[datetime] = mapped_column(DateTime)
    present: Mapped[bool] = mapped_column(Boolean, default=True)

class RestaurantSettings(Base):
    __tablename__ = "restaurant_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="My Restaurant")
    address: Mapped[str] = mapped_column(String(300), default="")
    gstin: Mapped[str] = mapped_column(String(20), default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    receipt_footer: Mapped[str] = mapped_column(String(200), default="Thank you for dining with us!")
    currency_symbol: Mapped[str] = mapped_column(String(5), default="₹", server_default="₹")
    gst_rates: Mapped[str] = mapped_column(String(60), default="0,5,12,18,28", server_default="0,5,12,18,28")
    default_gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5, server_default="5")

class Recipe(Base):
    __tablename__ = "recipes"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), unique=True)
    ingredients: Mapped[list["RecipeIngredient"]] = relationship(cascade="all, delete-orphan")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))

class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    amount: Mapped[Decimal] = mapped_column(M())
    note: Mapped[str] = mapped_column(String(200), default="")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Reservation(Base):
    __tablename__ = "reservations"
    id: Mapped[int] = mapped_column(primary_key=True)
    table_id: Mapped[int] = mapped_column(ForeignKey("restaurant_tables.id"), index=True)
    guest_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20), default="")
    party_size: Mapped[int] = mapped_column(Integer, default=2)
    reserved_for: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(20), default="booked")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
