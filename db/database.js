const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB_PATH = path.join(DATA_DIR, 'game.db');
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT UNIQUE NOT NULL,
  display_name TEXT,
  kingdom TEXT,
  state TEXT,
  expected_type TEXT,
  expected_meta TEXT,
  expected_until INTEGER,
  data TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT,
  event TEXT,
  payload TEXT,
  created_at INTEGER
);
`);

module.exports = db;