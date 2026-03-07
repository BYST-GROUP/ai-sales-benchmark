import { NextRequest, NextResponse } from 'next/server'

/**
 * URL routing middleware
 *
 * Rewrites clean public URLs to internal query-param equivalents
 * so that app/page.tsx (the SPA) can handle all phases via searchParams:
 *
 *   /[companyName]                  → /?company=[slug]           (hero, pre-filled domain)
 *   /benchmark/company/[company]    → /?company=[slug]&start=1   (auto-start benchmark)
 *   /benchmark/session/[sessionId]  → /?session=[sessionId]      (load results from DB)
 *
 * Static assets, API routes, and Next.js internals are passed through untouched.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── /benchmark/session/[sessionId] ──────────────────────────────────────────
  const sessionMatch = pathname.match(/^\/benchmark\/session\/([^/]+)$/)
  if (sessionMatch) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('session', sessionMatch[1])
    return NextResponse.rewrite(url)
  }

  // ── /benchmark/company/[companyName] ────────────────────────────────────────
  const companyBenchmarkMatch = pathname.match(/^\/benchmark\/company\/([^/]+)$/)
  if (companyBenchmarkMatch) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('company', companyBenchmarkMatch[1])
    url.searchParams.set('start', '1')
    return NextResponse.rewrite(url)
  }

  // ── /[companyName] (single path segment, not "benchmark") ───────────────────
  const singleSegmentMatch = pathname.match(/^\/([^/]+)$/)
  if (singleSegmentMatch && singleSegmentMatch[1] !== 'benchmark') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('company', singleSegmentMatch[1])
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run on all paths except Next.js internals, API routes, and static files
  matcher: ['/((?!_next|api|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)'],
}
