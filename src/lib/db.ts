import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');

declare global {
  // eslint-disable-next-line no-var
  var __db__: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export const db = global.__db__ ?? createConnection();
if (process.env.NODE_ENV !== 'production') global.__db__ = db;

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outlets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outlet_id INTEGER NOT NULL REFERENCES outlets(id),
      filename TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      detected_periods TEXT,
      sheets_total INTEGER DEFAULT 0,
      sheets_used INTEGER DEFAULT 0,
      sheets_ignored INTEGER DEFAULT 0,
      rows_processed INTEGER DEFAULT 0,
      rows_mapped INTEGER DEFAULT 0,
      rows_unmapped INTEGER DEFAULT 0,
      data_quality_pct REAL DEFAULT 0,
      debug_log TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_uploads_outlet ON uploads(outlet_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_uploads_hash ON uploads(outlet_id, file_hash);

    CREATE TABLE IF NOT EXISTS account_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_pattern TEXT NOT NULL,
      normalized_account TEXT NOT NULL,
      pnl_group TEXT NOT NULL,
      analysis_group TEXT NOT NULL,
      subcategory TEXT,
      mapping_priority INTEGER NOT NULL DEFAULT 100,
      match_type TEXT NOT NULL DEFAULT 'contains',
      source TEXT NOT NULL DEFAULT 'seed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      outlet_id INTEGER NOT NULL REFERENCES outlets(id),
      period TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      source_file TEXT NOT NULL,
      source_sheet TEXT NOT NULL,
      source_row INTEGER NOT NULL,
      account_code TEXT,
      account_name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      subcategory TEXT,
      analysis_group TEXT NOT NULL,
      mapping_id INTEGER REFERENCES account_mapping(id),
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tx_outlet_period ON transactions(outlet_id, period);
    CREATE INDEX IF NOT EXISTS idx_tx_upload ON transactions(upload_id);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);

    CREATE TABLE IF NOT EXISTS reconciliation_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      check_name TEXT NOT NULL,
      source_value REAL,
      computed_value REAL,
      variance REAL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

initSchema();
