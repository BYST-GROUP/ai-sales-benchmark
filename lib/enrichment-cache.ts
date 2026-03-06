/**
 * enrichment-cache.ts — server-side only
 *
 * Caches Claude enrichment results per domain in data/enrichment-cache.json.
 * Cached entries are considered fresh for 6 months; stale entries are re-fetched.
 */

import fs from 'fs'
import path from 'path'
import type { CompanyProfile } from '@/types'

const CACHE_FILE = path.join(process.cwd(), 'data', 'enrichment-cache.json')
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000

interface CacheEntry {
  cachedAt: string
  profile: CompanyProfile
  enrichment_message: string
}

type CacheStore = Record<string, CacheEntry>

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '').trim()
}

function readCache(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    const raw = fs.readFileSync(CACHE_FILE, 'utf8')
    return JSON.parse(raw) as CacheStore
  } catch {
    return {}
  }
}

function writeCache(store: CacheStore): void {
  const dir = path.dirname(CACHE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2))
}

/**
 * Returns cached enrichment data for a domain if it exists and is < 6 months old.
 * Returns null if the cache is missing or stale.
 */
export function getCachedEnrichment(domain: string): CacheEntry | null {
  const key = normalizeDomain(domain)
  const store = readCache()
  const entry = store[key]
  if (!entry) return null

  const age = Date.now() - new Date(entry.cachedAt).getTime()
  if (age > SIX_MONTHS_MS) return null

  return entry
}

/**
 * Saves enrichment data for a domain to the cache.
 */
export function setCachedEnrichment(
  domain: string,
  profile: CompanyProfile,
  enrichment_message: string,
): void {
  const key = normalizeDomain(domain)
  const store = readCache()
  store[key] = {
    cachedAt: new Date().toISOString(),
    profile,
    enrichment_message,
  }
  writeCache(store)
}
