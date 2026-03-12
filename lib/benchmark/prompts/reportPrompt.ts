import { QUESTION_MAP } from '@/lib/questions'

/** Maps each question ID to its pillar display name. */
const QUESTION_PILLAR: Record<string, string> = {
  Q1: 'AE Sales Systems',
  Q2: 'AE Sales Systems',
  Q3: 'AE Sales Systems',
  Q4: 'AE Sales Systems',
  Q5: 'Leadership Systems',
  Q6: 'Leadership Systems',
  Q7: 'Leadership Systems',
  Q8: 'Enablement Systems',
  Q9: 'Enablement Systems',
}

function formatConversationHistory(conversation: ReportConversationEntry[]): string {
  return conversation
    .map(({ questionId, answer, score }) => {
      const pillar       = QUESTION_PILLAR[questionId] ?? 'Unknown'
      const questionText = QUESTION_MAP[questionId]?.text ?? questionId
      return `Pillar: ${pillar}\n${questionId} (score: ${score}/5)\nQuestion: "${questionText}"\nAnswer: "${answer}"`
    })
    .join('\n\n')
}

export interface ReportConversationEntry {
  questionId: string
  answer: string
  score: number
}

/** App-computed maturity values passed into the report prompt. */
export interface ReportComputedValues {
  totalScore: number
  currentStage: string       // e.g. 'AI Enabled'
  nextStage: string | null   // e.g. 'AI Leading', or null if AI Native
}

/**
 * System prompt for the final report LLM call (Anthropic mode).
 *
 * This call fires once — after all benchmark questions are answered.
 * It receives the full Q&A history + scores and returns a structured,
 * personalised assessment report.
 *
 * Replaces the hardcoded applyScores() + static results-content.ts logic.
 */
export const REPORT_SYSTEM_PROMPT = `You are a sales AI maturity analyst. You have just completed a structured benchmark interview with a sales organisation.

The application has already computed the total score, current stage, and next stage deterministically. These values are provided in the user message — use them exactly as given. Do NOT recompute the total score or maturity stage.

Your job is to generate the personalised qualitative sections of the report based on what the organisation actually said.

## Maturity Reference

**Pillars and questions:**
- Pillar 1 — AE Systems: Q1 (AI day-to-day usage), Q2 (call notes & CRM updates), Q3 (meeting prep), Q4 (handling technical questions)
- Pillar 2 — Leadership Systems: Q5 (spotting underperformance), Q6 (top performer insights), Q7 (feedback frequency)
- Pillar 3 — Enablement Systems: Q8 (sales onboarding), Q9 (playbooks & battlecards)

**Maturity stages (for context only — use the provided values, not these to compute):**
- 0–20:   AI Laggard       — Stage 1: The Wild West
- 21–40:  AI Experimenting  — Stage 2: Emerging Assistants
- 41–65:  AI Enabled        — Stage 3: Connected Workflows
- 66–85:  AI Leading        — Stage 4: Automated Insights
- 86–100: AI Native         — Stage 5: AI-First GTM Platform

## Report Writing Rules

Write everything grounded in what the organisation actually said — not generic stage descriptions.

- **currentStage**: An object with two string fields:
  - "whatItLooksLike" (2–3 sentences): What their team is actually doing. Reference specifics (tools mentioned, workflows described).
  - "theProblem" (2–3 sentences): The outcomes and pain they're likely experiencing given their setup.
- **nextStage.whatItLooksLike**: 2–3 sentences. Concrete description of what moving to the next stage would look like for their team specifically — not generic.
- **nextStage.whyItMatters**: 1–2 sentences. Why this next step matters for their business.
- **nextStage.impactStats**: Exactly 4 metrics relevant to their stage transition. Use realistic industry benchmarks. Labels should be short (3–5 words). Values should be specific (e.g. "~2.5 hrs/rep/day", "+15–20%").

## Output Format

Return ONLY valid JSON. Use the exact totalScore, maturityLabel (= Current Stage), and maturityStage provided in the user message.
{
  "pillarScores": { "pillar1": 65, "pillar2": 40, "pillar3": 80 },
  "totalScore": <use provided Total Score>,
  "maturityLabel": "<use provided Current Stage>",
  "maturityStage": "<full stage label, e.g. Stage 3: Connected Workflows>",
  "currentStage": {
    "whatItLooksLike": "2–3 sentences about what the team is currently doing.",
    "theProblem": "2–3 sentences about the pain and outcomes they are experiencing."
  },
  "nextStage": {
    "title": "<use provided Next Stage>",
    "whatItLooksLike": "...",
    "whyItMatters": "...",
    "impactStats": [
      { "label": "Admin time saved", "value": "~3.5 hrs/rep/day" },
      { "label": "Win rate improvement", "value": "+18–25%" },
      { "label": "OTE to Quota lift", "value": "+20–25%" },
      { "label": "Forecast accuracy", "value": "+20% improvement" }
    ]
  }
}

If Next Stage is null (organisation is already AI Native), set "nextStage" to null.
No text outside the JSON object.`

/**
 * Builds the user message for the report LLM call (Anthropic mode).
 */
export function buildReportUserMessage(
  companyContext: string | null | undefined,
  conversation: ReportConversationEntry[],
  computed?: ReportComputedValues,
): string {
  const historyText = formatConversationHistory(conversation)
  const scoresJson  = JSON.stringify(
    Object.fromEntries(conversation.map(({ questionId, score }) => [questionId, score]))
  )

  const computedSection = computed
    ? `Total Score: ${computed.totalScore}
Current Stage: ${computed.currentStage}
Next Stage: ${computed.nextStage ?? 'None (already AI Native)'}
`
    : ''

  return `${companyContext ? `Company context: ${companyContext}\n\n` : ''}Benchmark conversation — questions, answers, and scores:
${historyText}

${computedSection}Raw scores: ${scoresJson}

Generate the full personalised assessment report.`
}

/**
 * Builds the template variable map for the OpenAI stored prompt — report call.
 * Variable names match the {{placeholder}} slots defined in the stored prompt.
 *
 * Core variables:
 *   {{companycontext}}      — enriched company context string
 *   {{conversationhistory}} — formatted Q&A + scores (alias: {{historytext}})
 *   {{historytext}}         — same as conversationhistory (for prompt compatibility)
 *   {{scoresjson}}          — raw scores as JSON object
 *   {{totalscore}}          — app-computed total score (0–100)
 *   {{currentstage}}        — app-computed maturity label (e.g. 'AI Enabled')
 *   {{nextstage}}           — app-computed next stage label, or empty if AI Native
 *
 * Stub variables (empty — included so prompts that reference them don't error):
 *   {{answeredcount}}, {{totalcount}}, {{currentquestionid}},
 *   {{currentquestiontext}}, {{answer}}, {{remaining}}
 */
export function buildReportVariables(
  companyContext: string | null | undefined,
  conversation: ReportConversationEntry[],
  computed?: ReportComputedValues,
): Record<string, string> {
  const conversationHistory = formatConversationHistory(conversation)
  const scoresJson = JSON.stringify(
    Object.fromEntries(conversation.map(({ questionId, score }) => [questionId, score]))
  )

  return {
    companycontext:       companyContext ?? '',
    conversationhistory:  conversationHistory,
    historytext:          conversationHistory,   // alias — same content, different placeholder name
    scoresjson:           scoresJson,
    // App-computed maturity values — passed so the LLM uses them rather than recomputing
    totalscore:           computed ? String(computed.totalScore) : '',
    currentstage:         computed?.currentStage ?? '',
    nextstage:            computed?.nextStage ?? '',
    // Stubs for variables present in other prompts — prevents 400 errors if
    // OPENAI_SCORE_REPORT_PROMPT_ID points to a prompt that shares these slots
    answeredcount:        String(conversation.length),
    totalcount:           String(conversation.length),
    currentquestionid:    'REPORT',
    currentquestiontext:  '',
    answer:               '',
    remaining:            '(none)',
  }
}
