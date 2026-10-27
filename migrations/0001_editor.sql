CREATE TABLE IF NOT EXISTS editor_sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS editor_state(kind TEXT NOT NULL CHECK(kind IN ('rating','saved','note')),item_id TEXT NOT NULL,value TEXT NOT NULL,revision INTEGER NOT NULL,last_op TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,item_id));
