import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkState } from '@/lib/benchmark-state'

/**
 * GET /api/session/[sessionId]
 *
 * Fetches a completed benchmark session from Neon Postgres.
 * Returns a reconstructed BenchmarkState and domain for the results page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.POSTGRES_URL)

    const rows = await sql`
      SELECT data, domain
      FROM logs
      WHERE session_id = ${sessionId}
        AND event = 'benchmark_complete'
      ORDER BY timestamp DESC
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data, domain } = rows[0] as { data: Record<string, unknown>; domain: string }

    // Reconstruct BenchmarkState from stored event data
    const benchmarkState: BenchmarkState = {
      answers:           (data.answers    as BenchmarkState['answers'])    ?? {},
      scores:            (data.scores     as BenchmarkState['scores'])     ?? {},
      remainingQuestions: [],
      pillarScores:      (data.pillarScores as BenchmarkState['pillarScores']) ?? {
        pillar1: 0,
        pillar2: 0,
        pillar3: 0,
      },
      totalScore:    (data.totalScore    as number) ?? 0,
      maturityLabel: (data.maturityLabel as string) ?? 'AI Laggard',
      maturityStage: (data.maturityStage as string) ?? '',
    }

    return NextResponse.json({ benchmarkState, domain })
  } catch (err) {
    console.error('[session] Error fetching session:', err)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
