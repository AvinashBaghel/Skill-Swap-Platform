"""
SkillSwap — Supabase Python Client (lightweight, httpx-based)
Talks directly to the Supabase PostgREST API — no heavy SDK needed.
"""

import os
import httpx
from dotenv import load_dotenv

# Load .env from this directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

supabase_available = bool(SUPABASE_URL and SUPABASE_KEY)

# Base URL for PostgREST
_REST = f"{SUPABASE_URL}/rest/v1"

# Common headers for every request
_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",   # return inserted/updated rows
}

if supabase_available:
    print(f"[Supabase] Client ready -> {SUPABASE_URL}")
else:
    print("[Supabase] No credentials - set SUPABASE_URL and SUPABASE_KEY in backend/.env")


# ═════════════════════════════════════════════════════════════════════════
#  Low-level helpers
# ═════════════════════════════════════════════════════════════════════════

def _get(table, params=None):
    """GET rows from a table with optional query params."""
    r = httpx.get(f"{_REST}/{table}", headers=_HEADERS, params=params or {}, timeout=10)
    r.raise_for_status()
    return r.json()


def _post(table, data):
    """INSERT a row and return it."""
    r = httpx.post(f"{_REST}/{table}", headers=_HEADERS, json=data, timeout=10)
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def _patch(table, params, data):
    """UPDATE rows matching params."""
    r = httpx.patch(f"{_REST}/{table}", headers=_HEADERS, params=params, json=data, timeout=10)
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def _delete(table, params):
    """DELETE rows matching params."""
    r = httpx.delete(f"{_REST}/{table}", headers=_HEADERS, params=params, timeout=10)
    r.raise_for_status()
    return True


# ═════════════════════════════════════════════════════════════════════════
#  USER helpers
# ═════════════════════════════════════════════════════════════════════════

def sb_get_user(user_id):
    """Fetch a single user by ID."""
    rows = _get("users", {"id": f"eq.{user_id}"})
    return rows[0] if rows else None


def sb_get_all_users():
    """Fetch all users."""
    return _get("users")


def sb_create_user(user_dict):
    """Insert a new user row."""
    return _post("users", user_dict)


def sb_update_user(user_id, updates):
    """Update fields on a user."""
    return _patch("users", {"id": f"eq.{user_id}"}, updates)


# ═════════════════════════════════════════════════════════════════════════
#  REQUEST helpers
# ═════════════════════════════════════════════════════════════════════════

def sb_get_requests(user_id):
    """Return {"received": [...], "sent": [...]} for user_id."""
    recv = _get("requests", {"to_user": f"eq.{user_id}"})
    sent = _get("requests", {"from_user": f"eq.{user_id}"})
    return {"received": recv, "sent": sent}


def sb_create_request(req_dict):
    """Insert a new skill-exchange request."""
    return _post("requests", req_dict)


def sb_update_request(req_id, status):
    """Update the status of a request."""
    return _patch("requests", {"id": f"eq.{req_id}"}, {"status": status})


def sb_delete_request(req_id):
    """Delete a request by ID."""
    return _delete("requests", {"id": f"eq.{req_id}"})


def sb_check_duplicate_request(from_id, to_id):
    """Check if a pending or accepted request already exists between two users (either direction)."""
    # Check from→to
    rows1 = _get("requests", {
        "from_user": f"eq.{from_id}",
        "to_user":   f"eq.{to_id}",
        "status":    "in.(pending,accepted)",
    })
    if len(rows1) > 0:
        return True
    # Check to→from (reverse direction)
    rows2 = _get("requests", {
        "from_user": f"eq.{to_id}",
        "to_user":   f"eq.{from_id}",
        "status":    "in.(pending,accepted)",
    })
    return len(rows2) > 0


def sb_check_active_session(user_a, user_b):
    """Check if there's an accepted (active) request between two users. Returns the request or None."""
    rows1 = _get("requests", {
        "from_user": f"eq.{user_a}",
        "to_user":   f"eq.{user_b}",
        "status":    "eq.accepted",
    })
    if rows1:
        return rows1[0]
    rows2 = _get("requests", {
        "from_user": f"eq.{user_b}",
        "to_user":   f"eq.{user_a}",
        "status":    "eq.accepted",
    })
    return rows2[0] if rows2 else None


def sb_update_request_fields(req_id, fields):
    """Update arbitrary fields on a request row."""
    return _patch("requests", {"id": f"eq.{req_id}"}, fields)


# ═════════════════════════════════════════════════════════════════════════
#  CHAT helpers
# ═════════════════════════════════════════════════════════════════════════

def sb_get_chat(user1, user2):
    """Fetch chat messages between two users, ordered by time."""
    # PostgREST OR filter
    rows = _get("messages", {
        "or":       f"(and(sender_id.eq.{user1},receiver_id.eq.{user2}),"
                    f"and(sender_id.eq.{user2},receiver_id.eq.{user1}))",
        "order":    "created_at.asc",
    })
    return rows


def sb_send_chat(sender_id, receiver_id, text):
    """Insert a chat message."""
    return _post("messages", {
        "sender_id":   sender_id,
        "receiver_id": receiver_id,
        "message":     text,
    })

