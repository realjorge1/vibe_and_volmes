import Module from 'node:module';

/**
 * Lets store-level integration tests run under `node --test`.
 *
 * Import this FIRST in a test file. The stores and the week engine pull in
 * a handful of native Expo modules (SQLite, audio, file system…) that can't
 * load in Node. Every `expo-*` / `react-native*` require is answered with an
 * inert stub, except `expo-sqlite`, which gets a small in-memory fake that
 * understands the key/value tables the save system actually uses.
 *
 * tsx runs these tests as CommonJS (package.json has no "type": "module"),
 * so intercepting `Module._load` catches every import.
 */

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

type Row = { value: string };

/** key/value tables: save_data, meta_profile, premium_account. */
const tables = new Map<string, Map<string, string>>();
function table(name: string): Map<string, string> {
  let t = tables.get(name);
  if (!t) {
    t = new Map();
    tables.set(name, t);
  }
  return t;
}

const KV_TABLE = /(save_data|meta_profile|premium_account)/;

const fakeDb = {
  execSync(sql: string) {
    for (const m of sql.matchAll(/DELETE FROM (\w+)/g)) table(m[1]).clear();
  },
  runSync(sql: string, params: unknown[] = []) {
    const t = sql.match(KV_TABLE)?.[1];
    if (!t) return;
    if (/^\s*INSERT/.test(sql)) {
      // save_data binds (key, value); the singleton tables bind (value) only.
      if (t === 'save_data') table(t).set(String(params[0]), String(params[1]));
      else table(t).set('singleton', String(params[0]));
    } else if (/^\s*DELETE/.test(sql)) {
      table(t).delete(String(params[0]));
    }
  },
  getFirstSync<T>(sql: string, params: unknown[] = []): T | null {
    const t = sql.match(KV_TABLE)?.[1];
    if (!t) return null;
    if (/COUNT\(\*\)/.test(sql)) {
      return { c: table(t).has('player') ? 1 : 0 } as T;
    }
    const key = t === 'save_data' ? String(params[0]) : 'singleton';
    const value = table(t).get(key);
    return value === undefined ? null : ({ value } satisfies Row as T);
  },
  getAllSync<T>(): T[] {
    return [];
  },
};

/** Stub for any native module: every property is a no-op function. */
function inertModule(): unknown {
  const fn = () => undefined;
  return new Proxy(fn, {
    get: (_t, prop) => (prop === '__esModule' ? true : inertModule()),
    apply: () => undefined,
    construct: () => ({}),
  });
}

const FAKES: Record<string, unknown> = {
  'expo-sqlite': { openDatabaseSync: () => fakeDb },
  'expo-constants': { __esModule: true, default: { expoConfig: { extra: {} } } },
};

const M = Module as unknown as {
  _load: (request: string, ...rest: unknown[]) => unknown;
};
const originalLoad = M._load;
let assetId = 0;
M._load = function (request: string, ...rest: unknown[]) {
  if (request in FAKES) return FAKES[request];
  // Bundled media (photos, beats) is a numeric asset id under Metro.
  if (/\.(webp|png|jpe?g|gif|wav|mp3|m4a)$/i.test(request)) return ++assetId;
  if (request === 'expo' || /^(expo-|react-native|@expo\/)/.test(request)) return inertModule();
  return originalLoad.call(this, request, ...rest);
};

/** Wipe the fake database between tests. */
export function resetFakeDb(): void {
  tables.clear();
}
