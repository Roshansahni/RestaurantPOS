"""Generates docs/ER_DIAGRAM.md and docs/API.md from the real code. Run: python scripts/gen_docs.py"""
import os, sys, pathlib
os.environ.setdefault("DATABASE_URL", "sqlite:///./gen_docs_tmp.db")
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.chdir(ROOT / "backend")
from app.main import app
from app.db import Base
from app import models  # noqa
from fastapi.routing import APIRoute

# ---- ER diagram ----
out = ["# Database ER Diagram", "", "Generated from the SQLAlchemy models (renders on GitHub or in any Mermaid viewer).", "", "```mermaid", "erDiagram"]
for t in Base.metadata.sorted_tables:
    for fk in (f for c in t.columns for f in c.foreign_keys):
        out.append(f'    {fk.column.table.name} ||--o{{ {t.name} : "{fk.parent.name}"')
for t in Base.metadata.sorted_tables:
    out.append(f"    {t.name} {{")
    for c in t.columns:
        typ = str(c.type).split("(")[0].replace(" ", "_") or "X"
        tag = "PK" if c.primary_key else ("FK" if c.foreign_keys else ("UK" if c.unique else ""))
        out.append(f"        {typ} {c.name} {tag}".rstrip())
    out.append("    }")
out += ["```", "", f"Tables: {len(Base.metadata.tables)}"]
(ROOT / "docs/ER_DIAGRAM.md").write_text("\n".join(out) + "\n")

# ---- API reference ----
def roles(route):
    for d in route.dependant.dependencies:
        if d.call.__qualname__.startswith("require."):
            return ", ".join(c.cell_contents for cell in d.call.__closure__ for c in [cell] if isinstance(c.cell_contents, str)) or ", ".join(
                x for cell in d.call.__closure__ if isinstance(cell.cell_contents, tuple) for x in cell.cell_contents)
        if d.call.__name__ == "current_user":
            return "any signed-in user"
    return "public"
rows = ["# API Reference", "", "Generated from the FastAPI routes. Interactive docs: http://localhost:8000/docs", "",
        "| Method | Path | Allowed roles | Handler |", "|---|---|---|---|"]
for r in app.routes:
    if isinstance(r, APIRoute) and r.path.startswith("/api"):
        for m in sorted(r.methods):
            rows.append(f"| {m} | `{r.path}` | {roles(r)} | {r.name} |")
ws = ROOT / "docs/WS_NOTE.txt"
note = ws.read_text() if ws.exists() else ""
(ROOT / "docs/API.md").write_text("\n".join(rows) + "\n" + note)
print("docs generated:", len(Base.metadata.tables), "tables,", len(rows) - 4, "endpoints")
