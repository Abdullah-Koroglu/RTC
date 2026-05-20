CREATE TABLE IF NOT EXISTS rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code     TEXT UNIQUE NOT NULL,
  host_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  type          TEXT NOT NULL DEFAULT 'public',
  password_hash TEXT,
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + interval '2 hours',
  ended_at      TIMESTAMPTZ,
  CHECK (type IN ('public', 'password', 'invite_only'))
);

CREATE TABLE IF NOT EXISTS room_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_join_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code     TEXT NOT NULL,
  peer_id       TEXT NOT NULL,
  user_id       UUID REFERENCES users(id),
  display_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  UNIQUE(room_code, peer_id),
  CHECK (status IN ('pending', 'approved', 'denied'))
);
