# Testing

## Automated (backend, pytest) – 32 tests
Run `cd backend && python -m pytest -q`. Covers: product image rules, configurable GST rates, rush priority, expense/employee/supplier edits, exports for all reports; lockout after 5 failed logins, refresh rotation and replay detection, logout/password-change revocation, audit-log access and security headers; WebSocket token rejection and live order events; recipes deducting/restoring stock, expenses, reservations (overlap and capacity), period/payment/inventory reports; GST calculation (intra-state, discount, IGST); login failure and missing token; role enforcement (kitchen cannot add products, cashier cannot see reports, inventory/employee/user/settings areas); order → payment → invoice flow and double-payment rejection; kitchen status permissions; dine-in table requirement; inventory purchase/consumption/negative-stock rejection; customer spend tracking and duplicate phone; tables CRUD; settings and GSTIN validation; password change; user management and self-lockout protection; dashboard, CSV and PDF reports.
The pytest suite uses SQLite; PostgreSQL is covered by the end-to-end run above, not by pytest.

## Frontend tests (Vitest + Testing Library) – 9 tests
`cd frontend && npm test`. Covers: login success/failure, billing screen (hides unavailable dishes, search, cart totals, disabled pay button, order payload contains items but never totals, receipt shown), and role-based navigation for signed-out/kitchen/cashier/admin. Other screens have no UI tests.

## Live end-to-end test – 33 checks
`scripts/e2e_smoke.py` drives a running server (see INSTALLATION.md). Last run: 33/33 passed against PostgreSQL with migrations 0001–0005 and seed data.

## Real-browser click-through – 13 checks
`scripts/ui_smoke/ui_smoke.mjs` drives the real UI in headless Chrome: sign-in page, cashier billing and cash payment with GST receipt, kitchen live update and Start button, admin dashboard, menu, inventory, reports, settings and audit screens; it also fails on any page error or HTTP 4xx/5xx. Last run: 13/13 passed on a Linux dev server (Chrome 131). It found and I fixed four issues: an overflowing top bar that hid the Settings and Log out links for admins, a "Pay Upi" label, a receipt missing date and payment method, and small kitchen text. Not run on macOS: set `CHROME_PATH` to your Chrome and run `cd scripts/ui_smoke && npm install && SEED_PW=... node ui_smoke.mjs` on a freshly seeded database.

## Build check (frontend)
`npm run build` runs the TypeScript compiler and builds.

## Manual test checklist (run before demo)
1. Sign in as each of the six demo users; confirm the top bar differs by role and wrong password is rejected.
2. Cashier: create a dine-in bill with 3 items and a ₹20 discount; confirm CGST = SGST and total = subtotal − discount + taxes (check with a calculator); pay by UPI; print preview shows restaurant name.
3. Try to pay the same order twice (use API docs page) → expect 400.
4. Kitchen: the order appears under New; move it to Complete; the table returns to Available.
5. Manager: add a dish, hide it, confirm it disappears from Billing; delete it.
6. Inventory: add stock, use more than available → error shown; low-stock appears on dashboard.
7. Dashboard shows the sale; CSV and PDF download and open.
8. Admin: create a cashier account, deactivate it, confirm it cannot sign in; try deactivating yourself → blocked.
9. Change your password, sign out, sign in with the new one.
10. Open Kitchen in one window and Billing in another: a new order must appear without refreshing; stop the backend and confirm the banner turns red, then restart and confirm it recovers.
11. Enter a wrong password 5 times → lockout message; open Settings → Audit as admin and confirm failed attempts are listed.
12. Stop the backend and reload: screens show an error message instead of crashing.
