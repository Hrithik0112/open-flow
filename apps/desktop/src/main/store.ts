import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import {
  DEFAULT_SETTINGS,
  type DictionaryRule,
  type Settings,
} from '@open-flow/shared';
import { dataDir, settingsPath, dictionaryPath, historyDbPath } from './paths.js';

export interface HistoryRow {
  id: number;
  timestamp: number;
  rawText: string;
  finalText: string;
  durationMs: number;
  bundleId: string | null;
  model: string;
}

function ensureDataDir(): void {
  mkdirSync(dataDir(), { recursive: true });
}

function readJsonOrDefault<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(path: string, value: unknown): void {
  ensureDataDir();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  writeFileSync(path, JSON.stringify(value, null, 2));
  try {
    // Best-effort cleanup; in practice writeFileSync to path is fine on macOS.
    const fs = require('node:fs');
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJsonOrDefault<Partial<Settings>>(settingsPath(), {}) };
}

export function saveSettings(settings: Settings): void {
  writeJsonAtomic(settingsPath(), settings);
}

export function loadDictionary(): DictionaryRule[] {
  return readJsonOrDefault<DictionaryRule[]>(dictionaryPath(), []);
}

export function saveDictionary(rules: DictionaryRule[]): void {
  writeJsonAtomic(dictionaryPath(), rules);
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  ensureDataDir();
  db = new Database(historyDbPath());
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      final_text TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      bundle_id TEXT,
      model TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS history_timestamp ON history(timestamp DESC);
  `);
  return db;
}

export function appendHistory(row: Omit<HistoryRow, 'id'>): void {
  getDb()
    .prepare(
      'INSERT INTO history (timestamp, raw_text, final_text, duration_ms, bundle_id, model) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(row.timestamp, row.rawText, row.finalText, row.durationMs, row.bundleId, row.model);
}

export function listHistory(limit = 100): HistoryRow[] {
  const rows = getDb()
    .prepare(
      'SELECT id, timestamp, raw_text as rawText, final_text as finalText, duration_ms as durationMs, bundle_id as bundleId, model FROM history ORDER BY timestamp DESC LIMIT ?',
    )
    .all(limit);
  return rows as HistoryRow[];
}

export function deleteHistory(ids: number[]): number {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) return 0;

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const result = getDb()
    .prepare(`DELETE FROM history WHERE id IN (${placeholders})`)
    .run(...uniqueIds);
  return result.changes;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
