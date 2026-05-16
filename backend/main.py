from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import mimetypes

from database import init_db, get_conn
from claude_parser import parse_receipt_image

app = FastAPI(title="GroceryTracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ── Roommates ────────────────────────────────────────────────────────────────

class RoommateIn(BaseModel):
    name: str


@app.get("/roommates")
def list_roommates():
    with get_conn() as conn:
        rows = conn.execute("SELECT id, name, created_at FROM roommates ORDER BY name").fetchall()
    return [dict(r) for r in rows]


@app.post("/roommates", status_code=201)
def create_roommate(body: RoommateIn):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Name cannot be empty")
    try:
        with get_conn() as conn:
            cur = conn.execute("INSERT INTO roommates (name) VALUES (?)", (name,))
            rid = cur.lastrowid
    except Exception:
        raise HTTPException(409, f"Roommate '{name}' already exists")
    return {"id": rid, "name": name}


@app.delete("/roommates/{roommate_id}", status_code=204)
def delete_roommate(roommate_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM roommates WHERE id = ?", (roommate_id,))


# ── Receipt parsing ───────────────────────────────────────────────────────────

@app.post("/receipts/parse")
async def parse_receipt(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")

    media_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "image/jpeg"
    if not media_type.startswith("image/"):
        raise HTTPException(415, "Only image files are supported")

    try:
        items = parse_receipt_image(data, media_type)
    except Exception as exc:
        raise HTTPException(502, f"Claude parsing failed: {exc}")

    return {"items": items}


# ── Sessions ──────────────────────────────────────────────────────────────────

class SessionItemIn(BaseModel):
    name: str
    price: float


class SessionIn(BaseModel):
    roommate_id: int
    label: Optional[str] = None
    items: list[SessionItemIn]


@app.get("/sessions")
def list_sessions(roommate_id: Optional[int] = None):
    with get_conn() as conn:
        if roommate_id:
            rows = conn.execute(
                """SELECT s.id, s.roommate_id, r.name as roommate_name,
                          s.label, s.total, s.created_at
                   FROM sessions s JOIN roommates r ON r.id = s.roommate_id
                   WHERE s.roommate_id = ?
                   ORDER BY s.created_at DESC""",
                (roommate_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT s.id, s.roommate_id, r.name as roommate_name,
                          s.label, s.total, s.created_at
                   FROM sessions s JOIN roommates r ON r.id = s.roommate_id
                   ORDER BY s.created_at DESC"""
            ).fetchall()
    return [dict(r) for r in rows]


@app.get("/sessions/{session_id}")
def get_session(session_id: int):
    with get_conn() as conn:
        session = conn.execute(
            """SELECT s.id, s.roommate_id, r.name as roommate_name,
                      s.label, s.total, s.created_at
               FROM sessions s JOIN roommates r ON r.id = s.roommate_id
               WHERE s.id = ?""",
            (session_id,),
        ).fetchone()
        if not session:
            raise HTTPException(404, "Session not found")
        items = conn.execute(
            "SELECT id, name, price FROM session_items WHERE session_id = ?",
            (session_id,),
        ).fetchall()
    return {**dict(session), "items": [dict(i) for i in items]}


@app.post("/sessions", status_code=201)
def create_session(body: SessionIn):
    if not body.items:
        raise HTTPException(400, "Session must have at least one item")

    total = round(sum(i.price for i in body.items), 2)

    with get_conn() as conn:
        roommate = conn.execute("SELECT id FROM roommates WHERE id = ?", (body.roommate_id,)).fetchone()
        if not roommate:
            raise HTTPException(404, "Roommate not found")

        cur = conn.execute(
            "INSERT INTO sessions (roommate_id, label, total) VALUES (?, ?, ?)",
            (body.roommate_id, body.label, total),
        )
        session_id = cur.lastrowid

        conn.executemany(
            "INSERT INTO session_items (session_id, name, price) VALUES (?, ?, ?)",
            [(session_id, i.name, i.price) for i in body.items],
        )

    return {"id": session_id, "total": total}


@app.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))


# ── Summary ───────────────────────────────────────────────────────────────────

@app.get("/summary")
def summary():
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT r.id, r.name,
                      COALESCE(SUM(s.total), 0) as total,
                      COUNT(s.id) as session_count
               FROM roommates r
               LEFT JOIN sessions s ON s.roommate_id = r.id
               GROUP BY r.id
               ORDER BY r.name"""
        ).fetchall()
    return [dict(r) for r in rows]
