import { NextRequest, NextResponse } from 'next/server'
import { getBenchmarkService } from '@/lib/benchmark/services/BenchmarkConversationService'
import { BenchmarkTurnInput } from '@/lib/benchmark/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const input = await req.json() as BenchmarkTurnInput

    if (!input.currentQuestionId || !input.answer) {
      return NextResponse.json(
        { error: 'currentQuestionId and answer are required' },
        { status: 400 }
      )
    }

    const service = getBenchmarkService()
    const output = await service.processAnswer(input)

    return NextResponse.json(output)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[benchmark-turn] error:', err)
    return NextResponse.json({ error: 'Benchmark turn failed', _debug: detail }, { status: 503 })
  }
}
