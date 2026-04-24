# SkillSwap Backend — Python/Flask API

## Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server starts at: **http://localhost:5000**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Current logged-in user |
| GET  | `/api/users` | List all users (no passwords) |
| GET  | `/api/users/<id>` | Get single user |
| PUT  | `/api/users/<id>` | Update own profile |
| GET  | `/api/requests?userId=<id>` | Get sent + received requests |
| POST | `/api/requests` | Send a skill exchange request |
| PATCH| `/api/requests/<id>` | Accept / decline / cancel |
| DELETE | `/api/requests/<id>` | Delete a request |
| GET  | `/api/chat/<other_id>` | Get chat messages with a user |
| POST | `/api/chat/<other_id>` | Send a chat message |

---

## Data Storage

All data is persisted to `backend/db.json` (auto-created on first run with 6 seed users).

## Seed Users (for testing login)

Use any password for the 6 default demo accounts:
- `jake`, `sara`, `maria`, `raj`, `alex`, `lena`

Example login body:
```json
{ "username": "jake", "password": "test123" }
```
