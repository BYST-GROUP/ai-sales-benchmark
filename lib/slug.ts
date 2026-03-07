/**
 * slug.ts — URL slug utilities
 *
 * Converts between company names / domains and URL-safe slugs used in routing:
 *   /hubspot          → domain "hubspot.com"
 *   /benchmark/company/hubspot.com → domain "hubspot.com"
 */

/**
 * Convert a domain or company name to a URL-safe slug.
 * Strips protocol, www, trailing slashes, and invalid chars.
 *
 * Examples:
 *   "hubspot.com"    → "hubspot.com"
 *   "www.acme.com"   → "acme.com"
 *   "HubSpot"        → "hubspot"
 *   "my company inc" → "my-company-inc"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, '')   // strip protocol
    .replace(/^www\./, '')          // strip www prefix
    .replace(/\/.*$/, '')           // strip path after domain
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/[^a-z0-9.\-]/g, '')   // remove invalid chars
    .trim()
}

/**
 * Convert a URL slug back to a domain for use in the app.
 * If the slug already looks like a domain (contains a dot), use as-is.
 * Otherwise append ".com".
 *
 * Examples:
 *   "hubspot"       → "hubspot.com"
 *   "hubspot.com"   → "hubspot.com"
 *   "my-company"    → "my-company.com"
 *   "acme.io"       → "acme.io"
 */
export function domainFromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug).toLowerCase().trim()
  // Already looks like a domain (letter/digit, dot, 2+ letter TLD)
  if (/[a-z0-9]\.[a-z]{2,}/.test(decoded)) return decoded
  return `${decoded}.com`
}

/**
 * Convert a domain to a URL slug for use in routes.
 *
 * Examples:
 *   "hubspot.com"   → "hubspot.com"
 *   "www.acme.com"  → "acme.com"
 */
export function slugFromDomain(domain: string): string {
  return slugify(domain)
}
