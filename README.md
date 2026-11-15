# RestaurantPOS – Smart Restaurant Point of Sale and Management System

React + TypeScript + Tailwind frontend, FastAPI + SQLAlchemy backend, PostgreSQL (SQLite for quick local runs).

## Quick start (macOS, Apple Silicon) – details in `docs/INSTALLATION.md`
```bash
brew install python@3.12 node
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # for the quick SQLite start, delete the DATABASE_URL line; set JWT_SECRET (openssl rand -hex 32)
SEED_PASSWORD='choose-a-strong-password' python seed.py     # development demo data only
uvicorn app.main:app --reload                               # API docs: http://localhost:8000/docs
# new terminal
cd frontend && npm install && npm run dev                   # app: http://localhost:5173
```
Demo users (password = your SEED_PASSWORD): admin, manager, cashier1, cashier2, kitchen1, kitchen2.
Run the backend as a single process (the live kitchen channel and login limiter are in-memory).

## What is included
Login with refresh tokens and lockout · role-based access (admin, manager, cashier, kitchen) enforced on the server · billing with CGST/SGST/IGST and invoices · simulated payments (cash/UPI/card/other) · real-time kitchen display with rush orders · menu with photos and recipes · tables and reservations · orders history · inventory with automatic stock deduction · suppliers · customers · employees and attendance · expenses · dashboard and reports with CSV/PDF export · restaurant, GST and currency settings · staff accounts · audit log.

## Documentation (`docs/`)
`PROJECT_REPORT.md` · `ER_DIAGRAM.md` and `API.md` (generated: `python scripts/gen_docs.py`) · `INSTALLATION.md` · `USER_MANUAL.md` · `TESTING.md` (with a manual checklist) · `FEATURE_CHECKLIST.md` (honest status of every module).

## Verification status
Verified: 32 backend tests; 9 frontend tests; frontend type-check and build; 33-check live end-to-end run (`scripts/e2e_smoke.py`) on real PostgreSQL; 13-check real-browser click-through in headless Chrome (`scripts/ui_smoke`); Alembic migrations 0001–0005 up and down on PostgreSQL and SQLite.
Not verified: Docker files, running on macOS itself, Safari/Firefox, phones/tablets. Screens were checked visually at 1366×820 only.

## Limits
Payments are simulated (no gateway). Receipts print through the browser dialog (no thermal-printer integration). No HSN codes or inter-state toggle on the billing screen. GST logic should be reviewed by an accountant before real use. Multi-process deployment needs a shared broker/limiter (e.g. Redis).
