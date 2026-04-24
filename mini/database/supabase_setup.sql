-- =====================================================================
--  SkillSwap — Supabase Database Setup
--  Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
--  Go to: SQL Editor → New Query → Paste this → Click "Run"
-- =====================================================================

-- 1. Create the messages table
CREATE TABLE IF NOT EXISTS messages (
    id          BIGSERIAL PRIMARY KEY,
    sender_id   TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair     ON messages (sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_time     ON messages (created_at);

-- 3. Enable Row Level Security (RLS) — required by Supabase
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone to read messages (for simplicity in this demo)
--    In production, you'd restrict this to only the sender/receiver
CREATE POLICY "Anyone can read messages"
    ON messages FOR SELECT
    USING (true);

-- 5. Allow anyone to insert messages
CREATE POLICY "Anyone can send messages"
    ON messages FOR INSERT
    WITH CHECK (true);

-- 6. Enable real-time for the messages table
--    Go to: Database → Replication → enable "messages" table
--    OR run this:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =====================================================================
--  Optional: Create a users table for future backend integration
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    initials    TEXT,
    title       TEXT DEFAULT 'SkillSwap Member',
    rating      TEXT DEFAULT '0.0',
    students    TEXT DEFAULT '0',
    location    TEXT DEFAULT '',
    bio         TEXT DEFAULT '',
    offered     TEXT[] DEFAULT '{}',
    wanted      TEXT[] DEFAULT '{}',
    greeting    TEXT DEFAULT '',
    availability JSONB DEFAULT '{}',
    password    TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create users"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (true);

-- =====================================================================
--  Skill Exchange Requests table
-- =====================================================================
CREATE TABLE IF NOT EXISTS requests (
    id          TEXT PRIMARY KEY,
    from_user   TEXT NOT NULL,
    to_user     TEXT NOT NULL,
    from_name   TEXT,
    from_initials TEXT,
    from_skills JSONB DEFAULT '[]',
    to_name     TEXT,
    to_initials TEXT,
    to_skills   JSONB DEFAULT '[]',
    want_to_learn JSONB DEFAULT '[]',
    can_teach   JSONB DEFAULT '[]',
    message     TEXT DEFAULT '',
    status      TEXT DEFAULT 'pending',
    timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_from   ON requests (from_user);
CREATE INDEX IF NOT EXISTS idx_requests_to     ON requests (to_user);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (status);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read requests"
    ON requests FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create requests"
    ON requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update requests"
    ON requests FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can delete requests"
    ON requests FOR DELETE
    USING (true);
