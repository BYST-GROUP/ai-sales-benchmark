import { QUESTION_MAP, ACTIVE_QUESTION_IDS } from '@/lib/questions'
import { BenchmarkTurnInput } from '@/lib/benchmark/types'

/**
 * System prompt for the SINGLE_LLM mode.
 * A single Claude call drives the entire conversation — scoring, transitions, and next question generation.
 */
export const SINGLE_LLM_SYSTEM_PROMPT = `You are running a sales AI maturity benchmark for a sales organisation. You conduct this as a structured expert conversation — concise, direct, and insightful.

## Benchmark Structure

**Pillar 1 — AE Systems** (questions: Q1, Q2, Q5)
- Q1: How AEs are currently using AI day-to-day
- Q2: How call notes and CRM are updated after meetings
- Q5: How AEs handle technical questions from prospects

**Pillar 2 — Leadership Systems** (questions: Q6, Q8)
- Q6: When and how underperformance is spotted
- Q8: How often AEs receive feedback

**Pillar 3 — Enablement Systems** (questions: Q10)
- Q10: Whether AEs use playbooks and battlecards

## Answer Options (use these exactly when providing options)

Q2 options:
- "AEs update the CRM manually — when they remember to"
- "We record calls with a tool like Gong or Fireflies, but CRM is still updated manually"
- "Call notes and CRM fields are updated automatically after every meeting"

Q5 options:
- "They loop in a solutions engineer or follow up after the call"
- "They look it up themselves or use ChatGPT to draft a response"
- "They have an AI agent that is trained on company data and provides answers"

Q6 options:
- "Usually when the quarter is already at risk"
- "We check CRM data and listen to recordings periodically"
- "We have dashboards that flag warning signals before it becomes a pipeline problem"

Q8 options:
- "Mainly during 1:1s or quarterly reviews"
- "A few times a month when we flag specific calls to review"
- "After every call, they get feedback based on how they performed"

Q10 options:
- "We don't have playbooks or battlecards in place"
- "We have some docs but reps rarely use them"
- "Yes — reps have structured playbooks and up-to-date battlecards they use in deals"

## Maturity Scoring (1–5)

- 1 — Wild West: Ad-hoc AI experiments, no governance
- 2 — Emerging Assistants: Team-level adoption, uneven, disconnected tools
- 3 — Connected Workflows: AI in CRM and core workflows, repeatable
- 4 — Automated Insights: Proactive AI insights, predictive GTM motion
- 5 — AI-First Platform: Fully automated end-to-end, unified AI platform

## Stage Transitions

When moving from Pillar 1 to Pillar 2, include this transition:
"That gives me a clear picture of your AE systems. Let's shift to leadership — I want to understand how you spot performance issues and how feedback reaches your reps."

When moving from Pillar 2 to Pillar 3, include this transition:
"Good — I can see how your leadership systems work. Last area: enablement. I want to understand how your reps are equipped with playbooks and battlecards."

## Response Rules

- Insight: Optional. 1–3 sentences. A punchy, data-backed observation that bridges their answer to the next question. Raises the stakes. Not required for every question — use it when it genuinely adds context.
- Stage transition: Only when crossing pillar boundaries. Use exact text above.
- Question transition: 1–2 short sentences max. A short conversational bridge leading into the next question. Be specific to what they said. Never generic.
- Next question: State it clearly and directly. No preamble.
- Options: Include the exact options from the list above when the next question has them.
- Be conversational but efficient — no long paragraphs.

## Output Format

Return ONLY a valid JSON object:
{
  "scores": { "Q1": 3, "Q2": 2 },
  "message": "Full message shown to the user. Combine any insight, stage transition, question transition, and the next question into a single natural block of text.",
  "next_question_id": "Q2",
  "options": ["option 1", "option 2", "option 3"],
  "is_complete": false
}

- "scores": include ALL question IDs scored in this turn (may be multiple)
- "message": single user-facing string — insight + transitions + next question combined. Do NOT put options inside message.
- "next_question_id": string or null (null only when benchmark is complete)
- "options": array of strings, or null if next question is free-form
- "is_complete": true only when all questions are answered and there is no next question

No text outside the JSON object.`

/**
 * Builds the user message for the START turn (Anthropic mode).
 * Used when currentQuestionId === 'START' — the user has just confirmed/corrected
 * company info and we want the LLM to open the benchmark with Q1.
 */
export function buildStartUserMessage(input: BenchmarkTurnInput): string {
  const { answer, companyContext } = input

  return `${companyContext ? `Company context:\n${companyContext}\n\n` : ''}The user has just confirmed (or corrected) the company information above.
Their response: "${answer}"

This is the START of the benchmark — no questions have been asked yet.
Open the benchmark and ask Q1.

Return JSON:
{
  "scores": {},
  "message": "<opening message + full Q1 question text>",
  "next_question_id": "Q1",
  "options": null,
  "is_complete": false
}`
}

/**
 * Builds the template variable map for the OpenAI stored prompt — START turn.
 * Variable names match the {{placeholder}} slots defined in the stored prompt.
 */
export function buildStartVariables(input: BenchmarkTurnInput): Record<string, string> {
  const { answer, companyContext } = input
  const totalCount = ACTIVE_QUESTION_IDS.length

  return {
    answeredcount:       '0',
    totalcount:          String(totalCount),
    currentquestionid:   'START',
    currentquestiontext: 'N/A — benchmark has not started yet',
    answer,
    scoresjson:          '{}',
    companycontext:      companyContext ?? '',
    historytext:         '(none yet)',
    // All questions are unanswered at the start — IDs only, no content
    remaining:           ACTIVE_QUESTION_IDS.join(', '),
  }
}

/**
 * Builds the template variable map for the OpenAI stored prompt.
 * Variable names match the {{placeholder}} slots defined in the stored prompt exactly.
 */
export function buildSingleLlmVariables(input: BenchmarkTurnInput): Record<string, string> {
  const {
    currentQuestionId,
    answer,
    remainingQuestions,
    companyContext,
    currentScores = {},
    conversationHistory = [],
  } = input

  const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId
  const answeredCount = ACTIVE_QUESTION_IDS.length - remainingQuestions.length
  const totalCount = ACTIVE_QUESTION_IDS.length

  const historyText = conversationHistory.length > 0
    ? conversationHistory.map(t => `${t.questionId}: ${t.answer}`).join('\n')
    : '(none yet)'

  // Remaining = questions not yet answered after this turn (current question is being answered now)
  const remainingAfterThis = remainingQuestions.filter(id => id !== currentQuestionId)
  const remainingText = remainingAfterThis.length > 0 ? remainingAfterThis.join(', ') : '(none)'

  return {
    answeredcount:       String(answeredCount + 1),
    totalcount:          String(totalCount),
    currentquestionid:   currentQuestionId,
    currentquestiontext: currentQuestionText,
    answer,
    scoresjson:          JSON.stringify(currentScores),
    companycontext:      companyContext ?? '',
    historytext:         historyText,
    // IDs only — no question content
    remaining:           remainingText,
  }
}

/**
 * Builds the user message for the single-LLM benchmark turn (Anthropic mode).
 */
export function buildSingleLlmUserMessage(input: BenchmarkTurnInput): string {
  const {
    currentQuestionId,
    answer,
    remainingQuestions,
    companyContext,
    currentScores = {},
    conversationHistory = [],
  } = input

  const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

  const answeredCount = ACTIVE_QUESTION_IDS.length - remainingQuestions.length
  const totalCount = ACTIVE_QUESTION_IDS.length

  const scoresJson = JSON.stringify(currentScores)

  const historyText = conversationHistory.length > 0
    ? conversationHistory
        .map(t => `${t.questionId}: ${t.answer}`)
        .join('\n')
    : '(none yet)'

  // Remaining = unanswered question IDs after this turn (current question is being answered now)
  const remainingAfterThis = remainingQuestions.filter(id => id !== currentQuestionId)
  const remainingText = remainingAfterThis.length > 0 ? remainingAfterThis.join(', ') : '(none)'

  return `Company context: ${companyContext ?? ''}
Progress: ${answeredCount + 1} / ${totalCount} questions
Scores so far: ${scoresJson}
Conversation so far: ${historyText}
Current question asked: "${currentQuestionText}" Current question ID: ${currentQuestionId}
User's answer: "${answer}"
Remaining unanswered questions: ${remainingText}
Analyze the user answer.
Determine how many benchmark dimensions were answered.
Score all applicable dimensions using the BYST maturity framework.
Update which questions remain unanswered.
If this is the first turn, show the benchmark introduction before asking the first question.
Then generate the next appropriate benchmark question.
Return JSON only.`
}
