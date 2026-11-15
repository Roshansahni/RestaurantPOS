# Installation (macOS, Apple Silicon)

## 1. Tools
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/opt/homebrew/bin/brew shellenv)"
brew install python@3.12 node git
```
Optional (PostgreSQL via Docker): install Docker Desktop for Mac.

## 2. Backend
```bash
cd RestaurantPOS/backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Generate a secret and put it in `.env` as `JWT_SECRET`:
```bash
openssl rand -hex 32
```
**Quick start (SQLite):** delete the `DATABASE_URL=` line from `.env`. Tables are created automatically.

**PostgreSQL:** copy the root `.env.example` to `.env` (project root), set `DB_PASSWORD` and `JWT_SECRET`, then run `docker compose up -d db` from the project root (the database listens on 127.0.0.1:5432 only). In `backend/.env` set `DATABASE_URL=postgresql+psycopg2://pos_user:<DB_PASSWORD>@localhost:5432/restaurantpos` in `backend/.env` and run:
```bash
alembic upgrade head
```

**Everything in Docker (optional):** `docker compose up --build`, then open http://localhost:5173. Seed demo data with `docker compose exec -e SEED_PASSWORD='choose-a-strong-password' api python seed.py`. The Docker files have not been run by me; the same migrations and API were verified on a real PostgreSQL 16-class server outside Docker.

## 3. Demo data (development only)
```bash
SEED_PASSWORD='choose-a-strong-password' python seed.py
```
Creates users admin, manager, cashier1, cashier2, kitchen1, kitchen2 (all with that password), 10 categories, 40 dishes, 10 tables, inventory, customers, employees. It does nothing if users already exist. Never run it on a production database.

## 4. Run
```bash
uvicorn app.main:app --reload          # http://localhost:8000/docs
```
New terminal:
```bash
cd RestaurantPOS/frontend && npm install && npm run dev    # http://localhost:5173
```

## 5. Tests
```bash
cd backend && source .venv/bin/activate && python -m pytest -q
cd ../frontend && npm test && npm run build   # 9 UI tests, type-check, build
```

## 6. End-to-end smoke test (live server)
With the backend running and demo data seeded:
```bash
cd RestaurantPOS && python backend/../scripts/e2e_smoke.py http://localhost:8000 'choose-a-strong-password'
```
It signs in as all six roles, creates and pays a rush order, checks GST maths, live kitchen events, stock deduction, reports, uploads, refresh tokens and lockout (33 checks). Run it on a fresh seeded database: it changes data and locks out the made-up user `nobody`.

## 7. Regenerate docs
```bash
python scripts/gen_docs.py
```

## Troubleshooting
| Problem | Fix |
|---|---|
| `zsh: command not found: brew` | Run `eval "$(/opt/homebrew/bin/brew shellenv)"` |
| `psycopg2` fails to install | `brew install libpq` then `pip install psycopg2-binary` again, or use SQLite |
| Login page says "Something went wrong" | Backend isn't running on port 8000 |
| Browser shows CORS error | Frontend must run on http://localhost:5173, or add your origin to `CORS_ORIGINS` |
| Port 8000 in use | `uvicorn app.main:app --port 8001` and set `VITE_API_URL=http://localhost:8001/api` |
| `seed.py` says set SEED_PASSWORD | Prefix the command with `SEED_PASSWORD='...'` |
| Docker command fails | Make sure Docker Desktop is running; send the error text for help — this setup is untested |
