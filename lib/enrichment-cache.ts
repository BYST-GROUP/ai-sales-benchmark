/**
 * enrichment-cache.ts — server-side only
 *
 * Two backends, selected automatically:
 *   - Upstash Redis (production) — when UPSTASH_REDIS_REST_URL is set
 *   - File cache   (local dev)  — data/enrichment-cache.json
 *
 * Cached entries expire after 6 months in both backends.
 */

import fs from 'fs'
import path from 'path'
import type { CompanyProfile } from '@/types'

const SIX_MONTHS_MS      = 6 * 30 * 24 * 60 * 60 * 1000
const SIX_MONTHS_SECONDS = 6 * 30 * 24 * 60 * 60

// Use Upstash Redis in production (Vercel injects these when Upstash is connected)
const USE_KV = !!process.env.UPSTASH_REDIS_REST_URL

export interface CacheEntry {
  cachedAt: string
  profile: CompanyProfile
  enrichment_message: string
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '').trim()
}

// ─── File-based backend (local dev) ──────────────────────────────────────────

const CACHE_FILE = path.join(process.cwd(), 'data', 'enrichment-cache.json')

type FileStore = Record<string, CacheEntry>

function readFileStore(): FileStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as FileStore
  } catch {
    return {}
  }
}

function writeFileStore(store: FileStore): void {
  const dir = path.dirname(CACHE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2))
}

function fileGet(key: string): CacheEntry | null {
  const store = readFileStore()
  const entry = store[key]
  if (!entry) return null
  if (Date.now() - new Date(entry.cachedAt).getTime() > SIX_MONTHS_MS) return null
  return entry
}

function fileSet(key: string, entry: CacheEntry): void {
  const store = readFileStore()
  store[key] = entry
  writeFileStore(store)
}

// ─── Vercel KV backend (production) ──────────────────────────────────────────

async function getRedis() {
  const { Redis } = await import('@upstash/redis')
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

async function kvGet(key: string): Promise<CacheEntry | null> {
  const redis = await getRedis()
  return redis.get<CacheEntry>(key)
}

async function kvSet(key: string, entry: CacheEntry): Promise<void> {
  const redis = await getRedis()
  await redis.set(key, entry, { ex: SIX_MONTHS_SECONDS })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns cached enrichment for a domain if it exists and is < 6 months old.
 * Returns null on a miss or when the entry is stale.
 */
export async function getCachedEnrichment(domain: string): Promise<CacheEntry | null> {
  const key = `enrich:${normalizeDomain(domain)}`
  if (USE_KV) return kvGet(key)
  return fileGet(key.replace('enrich:', ''))
}

/**
 * Persists enrichment data for a domain. TTL is 6 months.
 */
export async function setCachedEnrichment(
  domain: string,
  profile: CompanyProfile,
  enrichment_message: string,
): Promise<void> {
  const entry: CacheEntry = {
    cachedAt: new Date().toISOString(),
    profile,
    enrichment_message,
  }
  const key = normalizeDomain(domain)
  if (USE_KV) {
    await kvSet(`enrich:${key}`, entry)
  } else {
    fileSet(key, entry)
  }
}
