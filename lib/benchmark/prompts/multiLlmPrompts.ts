import { QUESTION_MAP } from '@/lib/questions'

/**
 * System prompt for the scoring LLM call in MULTI_LLM mode.
 * Scores answers on a 1–5 maturity scale based on the Skaled AI GTM Maturity Curve.
 */
export const SCORING_SYSTEM_PROMPT = `You are scoring a sales organisation's AI maturity benchmark based on the Skaled AI GTM Maturity Curve.

You receive an answer to one benchmark question. Your job:
1. Score the answered question on a scale of 1–5
2. Check if any REMAINING unanswered questions were also covered in this response
3. Score those too if yes

Maturity stages:
- 1 — Wild West: Ad-hoc AI experiments, no governance or repeatability
- 2 — Emerging Assistants: Team-level adoption, uneven usage, disconnected tools
- 3 — Connected Workflows: AI in CRM and core workflows, repeatable processes
- 4 — Automated Insights: Proactive AI insights, predictive GTM motion
- 5 — AI-First Platform: Fully automated end-to-end, unified AI platform, no manual input

Return ONLY valid JSON in this exact format:
{
  "scores": {
    "Q1": 3
  }
}

Only include question IDs that were answered. No text outside the JSON object.`

/**
 * Builds the user message for the scoring LLM call in MULTI_LLM mode.
 */
export function buildScoringUserMessage(
  currentQuestionId: string,
  answer: string,
  remainingQuestions: string[]
): string {
  const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

  const otherRemaining = remainingQuestions
    .filter(id => id !== currentQuestionId)
    .map(id => `${id}: ${QUESTION_MAP[id]?.text ?? id}`)
    .join('\n')

  return `Question asked: "${currentQuestionText}"

Answer: "${answer}"

Remaining unanswered questions:
${otherRemaining || '(none)'}

Score the current question and identify if any remaining questions were also answered.`
}
