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
