import type { BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'

export async function scoreAnswer(
  currentQuestionId: string,
  answer: string,
  remainingQuestions: string[],
  sessionId?: string
): Promise<Record<string, number>> {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentQuestionId, answer, remainingQuestions, sessionId }),
  })
  if (!res.ok) throw new Error('Scoring failed')
  const data = await res.json()
  return (data.scores ?? {}) as Record<string, number>
}

/**
 * Unified benchmark turn — calls /api/benchmark-turn which dispatches to
 * either MultiLlmBenchmarkConversationService or SingleLlmBenchmarkConversationService
 * depending on the server-side BENCHMARK_LLM_MODE env variable.
 */
export async function processBenchmarkTurn(
  input: BenchmarkTurnInput
): Promise<BenchmarkTurnOutput> {
  const res = await fetch('/api/benchmark-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Benchmark turn failed')
  return res.json() as Promise<BenchmarkTurnOutput>
}

/**
 * Returns the IDs of questions that were answered "for free" in this response
 * (i.e. they appear in newScores but were not the current question being asked).
 */
export function getSkippedQuestions(
  remainingExcludingCurrent: string[],
  newScores: Record<string, number>,
  currentQuestionId: string
): string[] {
  return Object.keys(newScores).filter(
    id => id !== currentQuestionId && remainingExcludingCurrent.includes(id)
  )
}
