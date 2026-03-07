/**
 * logger.ts — server-side only
 *
 * Two backends, selected automatically:
 *   - Neon Postgres (production) — when POSTGRES_URL is set
 *   - JSONL file   (local dev)  — logs/sessions.jsonl
 *
 * Table schema (run once in Neon's SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS logs (
 *     id         SERIAL PRIMARY KEY,
 *     timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     event      TEXT        NOT NULL,
 *     session_id TEXT,
 *     domain     TEXT,
 *     data       JSONB
 *   );
 */

import fs from 'fs'
import path from 'path'

const USE_POSTGRES = !!process.env.POSTGRES_URL

// ─── File backend (local dev) ─────────────────────────────────────────────────

const LOG_DIR  = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'sessions.jsonl')

function appendToFile(entry: Record<string, unknown>): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n'
    fs.appendFileSync(LOG_FILE, line, 'utf8')
  } catch (err) {
    console.error('[logger] Failed to write log file:', err)
  }
}

// ─── Postgres backend (production) ───────────────────────────────────────────

async function appendToPostgres(entry: Record<string, unknown>): Promise<void> {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.POSTGRES_URL!)

  const { event, sessionId, session_id, domain, ...rest } = entry
  const sid = (sessionId ?? session_id ?? null) as string | null
  const dom = (domain ?? null) as string | null

  await sql`
    INSERT INTO logs (event, session_id, domain, data)
    VALUES (
      ${event as string},
      ${sid},
      ${dom},
      ${JSON.stringify(rest)}::jsonb
    )
  `
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Appends a structured log entry.
 * Always await this in API routes so the write completes before the function exits.
 */
export async function appendLog(entry: Record<string, unknown>): Promise<void> {
  if (USE_POSTGRES) {
    try {
      await appendToPostgres(entry)
    } catch (err) {
      console.error('[logger] Failed to write to Postgres:', err)
    }
  } else {
    appendToFile(entry)
  }
}
