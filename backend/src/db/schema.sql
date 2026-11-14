PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Seul le hachage SHA-256 du jeton de session est stocké.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS destinations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL UNIQUE,
  name              TEXT    NOT NULL,
  country           TEXT    NOT NULL,
  travel_type       TEXT    NOT NULL,
  short_description TEXT    NOT NULL,
  description       TEXT    NOT NULL,
  price_from        INTEGER NOT NULL,
  duration_days     INTEGER NOT NULL,
  rating            REAL    NOT NULL,
  featured          INTEGER NOT NULL DEFAULT 0,
  image_url         TEXT    NOT NULL,
  gallery           TEXT    NOT NULL DEFAULT '[]',
  highlights        TEXT    NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS activities (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id INTEGER NOT NULL REFERENCES destinations (id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  description    TEXT    NOT NULL,
  duration       TEXT    NOT NULL,
  included       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS trips (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id  INTEGER NOT NULL REFERENCES destinations (id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  departure_date  TEXT    NOT NULL,
  return_date     TEXT    NOT NULL,
  price           INTEGER NOT NULL,
  seats_total     INTEGER NOT NULL,
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0)
);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips (destination_id);

CREATE TABLE IF NOT EXISTS reservations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  trip_id        INTEGER NOT NULL REFERENCES trips (id),
  travelers      INTEGER NOT NULL CHECK (travelers BETWEEN 1 AND 9),
  total_price    INTEGER NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'annulee')),
  payment_status TEXT    NOT NULL DEFAULT 'non_payee' CHECK (payment_status IN ('non_payee')),
  notes          TEXT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  cancelled_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations (user_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  subject    TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
