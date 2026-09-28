import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('starrise.db');
    initSchema(db);
  }
  return db;
}

function initSchema(database: SQLite.SQLiteDatabase): void {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS save_data (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      saved_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS event_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id    TEXT NOT NULL,
      choice_id   TEXT NOT NULL,
      category    TEXT NOT NULL,
      flavor_text TEXT NOT NULL,
      week        INTEGER NOT NULL,
      logged_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS social_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      post_json  TEXT NOT NULL,
      week       INTEGER NOT NULL,
      logged_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS ai_cache (
      cache_key  TEXT PRIMARY KEY,
      payload    TEXT NOT NULL,
      week       INTEGER NOT NULL,
      hits       INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- Phase 5: cross-save meta-progression. Deliberately a SEPARATE table
    -- from save_data so retiring / starting a new career (clearAllData)
    -- never wipes unlocked perks, bloodlines and lifetime legacy.
    CREATE TABLE IF NOT EXISTS meta_profile (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      saved_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- Premium monetization: account-level cosmetic entitlements + soft
    -- currency. Like meta_profile, it lives OUTSIDE save_data so purchased
    -- cosmetics survive retirement / new game — you keep what you "paid" for.
    CREATE TABLE IF NOT EXISTS premium_account (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      saved_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}
