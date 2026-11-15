# Feature Completion Checklist
Status: ✅ done and tested · 🟡 partial · ❌ not built.

| Module | Status | Notes |
|---|---|---|
| Login / logout / JWT / protected routes / roles | ✅ | Tested. Refresh-token rotation with reuse detection, login lockout. |
| Password change | ✅ | |
| Dashboard (revenue, orders, customers, products, daily chart, popular, recent, low stock) | ✅ | Monthly view not separate. |
| POS billing (search, categories, cart, discount, GST, payment, invoice, print) | ✅ | Printing uses browser dialog. |
| Menu management | ✅ | CRUD, recipes, product photos (PNG/JPEG/WebP, ≤1 MB, content-checked). |
| Table management | ✅ | CRUD, status, reservations (Bookings screen). |
| Orders (dine-in/takeaway/online, status, cancel, history) | ✅ | Orders screen with filter, details, cancel. |
| Kitchen display | ✅ | Real-time over WebSocket with polling fallback; rush priority sorts first. |
| Inventory (items, stock in/out, low-stock, suppliers) | ✅ | Recipes auto-deduct stock and restore on cancel (may go negative). Suppliers screen. Purchases appear in the inventory report. |
| Employees + attendance | 🟡 | Add/edit/delete and attendance marking; no attendance report. |
| Customers | ✅ | Order history via API only. |
| Payments (cash/UPI/card/other) | 🟡 | Simulated only; no refunds. |
| GST + invoices | 🟡 | CGST/SGST/IGST, invoice numbers, configurable allowed rates. IGST is supported by the API but the billing screen has no inter-state toggle. No HSN codes. |
| Reports | ✅ | Daily/weekly/monthly/annual sales, payments, inventory, revenue-vs-expenses; CSV and PDF export for sales, payments, inventory and expenses. |
| Settings | ✅ | Restaurant info, GSTIN, currency symbol, GST rates, receipt footer, user management. |
| Expenses | ✅ | Record, edit, delete. |
| Reservations | ✅ | Booking, overlap check, seat/cancel/complete. |
| Permissions table | ❌ | Roles are fixed in code. |
| Audit logging | ✅ | Written and viewable by admin (Audit screen). |
| Alembic migrations | ✅ | 0001–0005 verified on SQLite only. |
| Docker | 🟡 | Compose with db, api, web written but never run by me. |
| Backend tests | ✅ | 32 passing. |
| Frontend tests | 🟡 | 9 UI tests (login, billing, role navigation). No other screens covered. |
| Real-browser UI test | ✅ | 13 checks in headless Chrome on Linux (`scripts/ui_smoke`); not run on macOS or in Safari/Firefox. |
| Live end-to-end test | ✅ | 33 checks on real PostgreSQL (`scripts/e2e_smoke.py`). |
| PostgreSQL migrations | ✅ | 0001–0005 up/down and seed verified on a real PostgreSQL server. |
