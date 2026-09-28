import { getDb } from './db';

// ─── Generic key/value save ────────────────────────────────────────────────

export function saveData(key: string, value: unknown): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO save_data (key, value, saved_at)
     VALUES (?, ?, strftime('%s','now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, saved_at = excluded.saved_at`,
    [key, JSON.stringify(value)]
  );
}

export function loadData<T>(key: string): T | null {
  const db = getDb();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM save_data WHERE key = ?',
    [key]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function deleteData(key: string): void {
  const db = getDb();
  db.runSync('DELETE FROM save_data WHERE key = ?', [key]);
}

export function hasSaveData(): boolean {
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(
    "SELECT COUNT(*) as c FROM save_data WHERE key = 'player'"
  );
  return (row?.c ?? 0) > 0;
}

// ─── Event log ────────────────────────────────────────────────────────────

export function logEvent(params: {
  eventId: string;
  choiceId: string;
  category: string;
  flavorText: string;
  week: number;
}): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO event_log (event_id, choice_id, category, flavor_text, week)
     VALUES (?, ?, ?, ?, ?)`,
    [params.eventId, params.choiceId, params.category, params.flavorText, params.week]
  );
}

export function loadEventLog(): Array<{
  eventId: string;
  choiceId: string;
  category: string;
  flavorText: string;
  week: number;
}> {
  const db = getDb();
  const rows = db.getAllSync<{
    event_id: string;
    choice_id: string;
    category: string;
    flavor_text: string;
    week: number;
  }>('SELECT * FROM event_log ORDER BY week DESC LIMIT 100');
  return rows.map((r) => ({
    eventId: r.event_id,
    choiceId: r.choice_id,
    category: r.category,
    flavorText: r.flavor_text,
    week: r.week,
  }));
}

// ─── Social history ───────────────────────────────────────────────────────

export function saveSocialPost(post: unknown, week: number): void {
  const db = getDb();
  db.runSync(
    'INSERT INTO social_history (post_json, week) VALUES (?, ?)',
    [JSON.stringify(post), week]
  );
}

export function loadSocialHistory(limit = 50): unknown[] {
  const db = getDb();
  const rows = db.getAllSync<{ post_json: string }>(
    'SELECT post_json FROM social_history ORDER BY week DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => {
    try { return JSON.parse(r.post_json); } catch { return null; }
  }).filter(Boolean);
}

// ─── AI generation cache ──────────────────────────────────────────────────

export function aiCacheGet(key: string): string | null {
  const db = getDb();
  const row = db.getFirstSync<{ payload: string }>(
    'SELECT payload FROM ai_cache WHERE cache_key = ?',
    [key]
  );
  if (!row) return null;
  db.runSync('UPDATE ai_cache SET hits = hits + 1 WHERE cache_key = ?', [key]);
  return row.payload;
}

export function aiCacheSet(key: string, payload: string, week: number): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO ai_cache (cache_key, payload, week)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, week = excluded.week`,
    [key, payload, week]
  );
}

/** Drop entries older than `olderThanWeek` so the cache can't grow forever. */
export function aiCachePrune(olderThanWeek: number): void {
  const db = getDb();
  db.runSync('DELETE FROM ai_cache WHERE week < ?', [olderThanWeek]);
}

// ─── Full save / load ─────────────────────────────────────────────────────

export function saveGameState(state: {
  player: unknown;
  game: unknown;
  music: unknown;
  relationships: unknown;
}): void {
  saveData('player', state.player);
  saveData('game', state.game);
  saveData('music', state.music);
  saveData('relationships', state.relationships);
}

export function loadGameState() {
  return {
    player: loadData('player'),
    game: loadData('game'),
    music: loadData('music'),
    relationships: loadData('relationships'),
  };
}

// ─── Phase 5: cross-save meta-progression ─────────────────────────────────
// Lives in its OWN table so it survives clearAllData (new game / retirement).

export function saveMeta(value: unknown): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO meta_profile (key, value, saved_at)
     VALUES ('profile', ?, strftime('%s','now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, saved_at = excluded.saved_at`,
    [JSON.stringify(value)]
  );
}

export function loadMeta<T>(): T | null {
  const db = getDb();
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM meta_profile WHERE key = 'profile'"
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

// ─── Premium: account-level cosmetic entitlements ─────────────────────────
// Lives in its OWN table (like meta_profile) so purchased cosmetics + premium
// currency survive clearAllData (new game / retirement).

export function savePremium(value: unknown): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO premium_account (key, value, saved_at)
     VALUES ('account', ?, strftime('%s','now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, saved_at = excluded.saved_at`,
    [JSON.stringify(value)]
  );
}

export function loadPremium<T>(): T | null {
  const db = getDb();
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM premium_account WHERE key = 'account'"
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

// NOTE: meta_profile and premium_account are intentionally NOT cleared here —
// they are the cross-save boundaries. Retiring or starting a new career keeps
// the legacy AND any purchased cosmetics.
export function clearAllData(): void {
  const db = getDb();
  db.execSync(
    'DELETE FROM save_data; DELETE FROM event_log; DELETE FROM social_history; DELETE FROM ai_cache;'
  );
}
