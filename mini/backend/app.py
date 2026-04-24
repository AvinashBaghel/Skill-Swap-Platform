"""
SkillSwap -- Python/Flask Backend
Run: python app.py
API base: http://localhost:5000/api

Storage: Supabase (PostgreSQL)
"""

import os
import sys
import uuid
import hashlib
from datetime import datetime
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from data import SEED_USERS

# -- Supabase integration -------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase_client import (
    supabase_available,
    sb_get_user, sb_get_all_users, sb_create_user, sb_update_user,
    sb_get_requests, sb_create_request, sb_update_request,
    sb_delete_request, sb_check_duplicate_request,
    sb_check_active_session, sb_update_request_fields,
    sb_get_chat, sb_send_chat,
)

app = Flask(__name__)
app.secret_key = "skillswap_secret_key_change_in_prod"
CORS(app, supports_credentials=True, origins=["*"])


# -----------------------------------------
#  Helpers
# -----------------------------------------

def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()


def _map_request_row(r):
    """Map Supabase request row (snake_case) -> frontend keys (camelCase)."""
    return {
        "id":           r.get("id", ""),
        "from":         r.get("from_user", ""),
        "to":           r.get("to_user", ""),
        "fromName":     r.get("from_name", ""),
        "fromInitials": r.get("from_initials", ""),
        "fromSkills":   r.get("from_skills", []),
        "toName":       r.get("to_name", ""),
        "toInitials":   r.get("to_initials", ""),
        "toSkills":     r.get("to_skills", []),
        "wantToLearn":  r.get("want_to_learn", []),
        "canTeach":     r.get("can_teach", []),
        "message":      r.get("message", ""),
        "status":       r.get("status", "pending"),
        "timestamp":    r.get("timestamp", ""),
        "fromFeedback": r.get("from_feedback", None),
        "toFeedback":   r.get("to_feedback", None),
    }


# -----------------------------------------
#  Seed Supabase with default users
# -----------------------------------------

def seed_supabase():
    """Insert SEED_USERS into Supabase if the users table is empty."""
    try:
        existing = sb_get_all_users()
        if len(existing) > 0:
            print(f"[Supabase] Users table already has {len(existing)} rows - skipping seed")
            return

        for uid, u in SEED_USERS.items():
            sb_create_user({
                "id":       uid,
                "name":     u["name"],
                "initials": u["initials"],
                "title":    u.get("title", "SkillSwap Member"),
                "rating":   u.get("rating", "0.0"),
                "students": u.get("students", "0"),
                "location": u.get("location", ""),
                "bio":      u.get("bio", ""),
                "offered":  u.get("offered", []),
                "wanted":   u.get("wanted", []),
                "greeting": u.get("greeting", ""),
                "password": u.get("password", "hashed_placeholder"),
            })
            print(f"[Supabase] Seeded user: {uid}")
    except Exception as e:
        print(f"[Supabase] Seed failed: {e}")


# -----------------------------------------
#  DB Status Route
# -----------------------------------------

@app.route("/api/db-status", methods=["GET"])
def db_status():
    """Quick health-check."""
    if not supabase_available:
        return jsonify({"status": "error", "engine": "none", "reason": "Supabase not configured"}), 503
    try:
        sb_get_all_users()
        return jsonify({"status": "connected", "engine": "supabase"}), 200
    except Exception as e:
        return jsonify({"status": "error", "engine": "supabase", "reason": str(e)}), 500


# -----------------------------------------
#  Auth Routes
# -----------------------------------------

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = (data.get("username") or "").strip().lower()
    name     = (data.get("name") or "").strip()
    password = (data.get("password") or "").strip()
    title    = (data.get("title") or "").strip()

    if not username or not name or not password:
        return jsonify({"error": "username, name, and password are required"}), 400

    parts = name.split()
    initials = data.get("initials") or ((parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else name[:2].upper())

    existing = sb_get_user(username)
    if existing:
        return jsonify({"error": "Username already taken"}), 409

    wanted   = data.get("wanted", [])
    bio      = data.get("bio", "")
    greeting = data.get("greeting", f"Hi! I'm {parts[0]} and I'm excited to swap skills!")

    sb_create_user({
        "id":       username,
        "name":     name,
        "initials": initials,
        "title":    title or "SkillSwap Member",
        "rating":   "0.0",
        "students": "0",
        "location": "",
        "bio":      bio,
        "offered":  [],
        "wanted":   wanted if isinstance(wanted, list) else [],
        "greeting": greeting,
        "password": hash_password(password),
    })

    session["user"] = username
    return jsonify({"ok": True, "userId": username, "name": name, "initials": initials}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = (data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    user = sb_get_user(username)
    if not user:
        return jsonify({"error": "User not found"}), 404

    stored_pw = user.get("password", "")
    if stored_pw != "hashed_placeholder" and stored_pw != hash_password(password):
        return jsonify({"error": "Incorrect password"}), 401

    session["user"] = username
    safe = {k: v for k, v in user.items() if k != "password"}
    return jsonify({"ok": True, "userId": username, "user": safe}), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"ok": True}), 200


@app.route("/api/auth/me", methods=["GET"])
def me():
    uid = session.get("user") or request.headers.get("X-User-Id")
    if not uid:
        return jsonify({"error": "Not logged in"}), 401

    user = sb_get_user(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    safe = {k: v for k, v in user.items() if k != "password"}
    return jsonify(safe), 200


# -----------------------------------------
#  User Routes
# -----------------------------------------

@app.route("/api/users", methods=["GET"])
def get_users():
    users = sb_get_all_users()
    return jsonify([{k: v for k, v in u.items() if k != "password"} for u in users]), 200


@app.route("/api/users/<user_id>", methods=["GET"])
def get_user(user_id):
    user = sb_get_user(user_id.lower())
    if not user:
        return jsonify({"error": "User not found"}), 404
    safe = {k: v for k, v in user.items() if k != "password"}
    return jsonify(safe), 200


@app.route("/api/users/<user_id>", methods=["PUT"])
def update_user(user_id):
    # Accept auth from session OR X-User-Id header (for cross-origin/file:// frontends)
    uid = session.get("user") or request.headers.get("X-User-Id")
    if uid != user_id.lower():
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    allowed = ["name", "title", "bio", "location", "offered", "wanted", "availability", "greeting"]
    updates = {k: data[k] for k in allowed if k in data}

    if "name" in updates:
        parts = updates["name"].split()
        updates["initials"] = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else updates["name"][:2].upper()

    try:
        user = sb_update_user(user_id.lower(), updates)
    except Exception as e:
        print(f"[Supabase] Update failed: {e}")
        # Retry without 'availability' in case the column doesn't exist yet
        updates.pop("availability", None)
        try:
            user = sb_update_user(user_id.lower(), updates)
        except Exception as e2:
            print(f"[Supabase] Update retry failed: {e2}")
            return jsonify({"error": f"Database update failed: {e2}"}), 500

    if not user:
        return jsonify({"error": "User not found"}), 404

    safe = {k: v for k, v in user.items() if k != "password"}
    return jsonify(safe), 200


# -----------------------------------------
#  Skill Exchange Request Routes
# -----------------------------------------

@app.route("/api/requests", methods=["GET"])
def get_requests():
    uid = request.args.get("userId") or session.get("user")
    if not uid:
        return jsonify({"error": "userId required"}), 400

    result = sb_get_requests(uid)
    return jsonify({
        "received": [_map_request_row(r) for r in result["received"]],
        "sent":     [_map_request_row(r) for r in result["sent"]],
    }), 200


@app.route("/api/requests", methods=["POST"])
def send_request():
    data = request.get_json()
    from_id     = data.get("from")
    to_id       = data.get("to")
    want_learn  = data.get("wantToLearn", [])
    can_teach   = data.get("canTeach", [])
    message     = data.get("message", "")

    if not from_id or not to_id:
        return jsonify({"error": "from and to are required"}), 400

    if sb_check_duplicate_request(from_id, to_id):
        return jsonify({"error": "Request already sent"}), 409

    from_user = sb_get_user(from_id) or {}
    to_user   = sb_get_user(to_id) or {}

    new_req = {
        "id":            str(uuid.uuid4()),
        "from_user":     from_id,
        "to_user":       to_id,
        "from_name":     from_user.get("name", from_id),
        "from_initials": from_user.get("initials", "??"),
        "from_skills":   can_teach or from_user.get("offered", []),
        "to_name":       to_user.get("name", to_id),
        "to_initials":   to_user.get("initials", "??"),
        "to_skills":     want_learn or to_user.get("offered", []),
        "want_to_learn": want_learn,
        "can_teach":     can_teach,
        "message":       message,
        "status":        "pending",
    }
    result = sb_create_request(new_req)
    return jsonify(_map_request_row(result)), 201


@app.route("/api/requests/<req_id>", methods=["PATCH"])
def update_request(req_id):
    data   = request.get_json()
    status = data.get("status")
    if status not in ("accepted", "declined", "cancelled", "completed"):
        return jsonify({"error": "Invalid status"}), 400

    result = sb_update_request(req_id, status)
    if not result:
        return jsonify({"error": "Request not found"}), 404
    return jsonify(_map_request_row(result)), 200


@app.route("/api/requests/<req_id>", methods=["DELETE"])
def delete_request(req_id):
    sb_delete_request(req_id)
    return jsonify({"ok": True}), 200


@app.route("/api/requests/<req_id>/feedback", methods=["POST"])
def submit_feedback(req_id):
    """Submit feedback for one side of a swap. When both submit, status -> completed."""
    data   = request.get_json()
    user_id = data.get("userId") or session.get("user") or request.headers.get("X-User-Id")
    rating  = data.get("rating", 5)
    text    = data.get("text", "")

    if not user_id:
        return jsonify({"error": "userId required"}), 400

    # Find the request to determine which side this user is on
    try:
        from supabase_client import _get
        rows = _get("requests", {"id": f"eq.{req_id}"})
        if not rows:
            return jsonify({"error": "Request not found"}), 404
        req = rows[0]
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    updates = {}
    if user_id == req.get("from_user"):
        updates["from_feedback"] = {"rating": rating, "text": text}
    elif user_id == req.get("to_user"):
        updates["to_feedback"] = {"rating": rating, "text": text}
    else:
        return jsonify({"error": "User is not part of this request"}), 403

    result = sb_update_request_fields(req_id, updates)

    # Merge to check if BOTH sides have submitted
    merged = {**req, **updates}
    from_fb = merged.get("from_feedback")
    to_fb   = merged.get("to_feedback")

    if from_fb and to_fb:
        # Both submitted — mark as completed
        sb_update_request(req_id, "completed")
        if result:
            result["status"] = "completed"

        # Update both users' average ratings from all completed requests
        from_user = req.get("from_user")
        to_user   = req.get("to_user")
        _update_user_rating(from_user)
        _update_user_rating(to_user)

    return jsonify(_map_request_row(result or merged)), 200


def _update_user_rating(user_id):
    """Calculate and update a user's average rating from all completed feedback."""
    try:
        from supabase_client import _get
        # Get all completed requests where this user was involved
        as_from = _get("requests", {
            "from_user": f"eq.{user_id}",
            "status": "eq.completed",
        })
        as_to = _get("requests", {
            "to_user": f"eq.{user_id}",
            "status": "eq.completed",
        })

        ratings = []
        # When user was 'from', the 'to' side rated them
        for r in as_from:
            fb = r.get("to_feedback")
            if fb and isinstance(fb, dict) and fb.get("rating"):
                ratings.append(int(fb["rating"]))
        # When user was 'to', the 'from' side rated them
        for r in as_to:
            fb = r.get("from_feedback")
            if fb and isinstance(fb, dict) and fb.get("rating"):
                ratings.append(int(fb["rating"]))

        if ratings:
            avg = round(sum(ratings) / len(ratings), 1)
            sb_update_user(user_id, {
                "rating": str(avg),
                "students": str(len(ratings)),
            })
            print(f"[Rating] Updated {user_id}: {avg} ({len(ratings)} reviews)")
    except Exception as e:
        print(f"[Rating] Failed to update {user_id}: {e}")


@app.route("/api/requests/active-session", methods=["GET"])
def check_active_session():
    """Check if there's an active (accepted) session between two users."""
    user_a = request.args.get("userA")
    user_b = request.args.get("userB")
    if not user_a or not user_b:
        return jsonify({"error": "userA and userB required"}), 400

    active = sb_check_active_session(user_a, user_b)
    if active:
        return jsonify({"active": True, "request": _map_request_row(active)}), 200
    return jsonify({"active": False}), 200


# -----------------------------------------
#  Chat messages
# -----------------------------------------

@app.route("/api/chat/<other_id>", methods=["GET"])
def get_chat(other_id):
    me_id = session.get("user") or request.headers.get("X-User-Id") or request.args.get("userId")
    if not me_id:
        return jsonify({"error": "Not authenticated"}), 401

    msgs = sb_get_chat(me_id, other_id)
    return jsonify([{
        "id":        m.get("id", ""),
        "from":      m.get("sender_id", ""),
        "text":      m.get("message", ""),
        "timestamp": m.get("created_at", ""),
    } for m in msgs]), 200


@app.route("/api/chat/<other_id>", methods=["POST"])
def post_chat(other_id):
    me_id = session.get("user") or request.headers.get("X-User-Id") or request.get_json().get("userId")
    if not me_id:
        return jsonify({"error": "Not authenticated"}), 401
    text = (request.get_json() or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    result = sb_send_chat(me_id, other_id, text)
    return jsonify({
        "id":        result.get("id", ""),
        "from":      result.get("sender_id", me_id),
        "text":      result.get("message", text),
        "timestamp": result.get("created_at", datetime.utcnow().isoformat()),
    }), 201


# -----------------------------------------
#  Run
# -----------------------------------------

if __name__ == "__main__":
    if not supabase_available:
        print("[ERROR] Supabase is not configured! Set SUPABASE_URL and SUPABASE_KEY in backend/.env")
        sys.exit(1)

    seed_supabase()
    print("SkillSwap API running at http://localhost:5000")
    print("[DB] Mode: Supabase")
    app.run(debug=True, port=5000)
