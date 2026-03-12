import { ACTIVE_QUESTION_IDS, ALL_QUESTION_IDS } from './questions'

// ─── Report (LLM-generated, replaces hardcoded results-content.ts) ───────────

export interface ImpactStat {
  label: string
  value: string
}

export interface BenchmarkReport {
  pillarScores: { pillar1: number; pillar2: number; pillar3: number }
  totalScore: number
  maturityLabel: string
  maturityStage: string
  currentStage: {
    /** 2–3 sentences: what the team is actually doing right now. */
    whatItLooksLike: string
    /** 2–3 sentences: the pain / outcomes they are experiencing. */
    theProblem: string
  }
  nextStage: {
    title: string
    whatItLooksLike: string
    whyItMatters: string
    impactStats: ImpactStat[]
  } | null
}

// ─── Benchmark state (tracks progress during the interview) ──────────────────

export interface BenchmarkState {
  answers: Record<string, string>
  scores: Record<string, number>
  remainingQuestions: string[]
  pillarScores: {
    pillar1: number
    pillar2: number
    pillar3: number
  }
  totalScore: number
  maturityLabel: string
  maturityStage: string
}

export function createInitialBenchmarkState(): BenchmarkState {
  return {
    answers: {},
    scores: {},
    remainingQuestions: [...ACTIVE_QUESTION_IDS],
    pillarScores: { pillar1: 0, pillar2: 0, pillar3: 0 },
    totalScore: 0,
    maturityLabel: '',
    maturityStage: '',
  }
}

// Normalise an average of 1–5 scores to 0–100
function normalisePillar(scores: Record<string, number>, ids: string[]): number {
  const present = ids.filter(id => scores[id] !== undefined)
  if (present.length === 0) return 0
  const avg = present.reduce((sum, id) => sum + scores[id], 0) / present.length
  return Math.round(((avg - 1) / 4) * 100)
}

/**
 * Computes the total maturity score (0–100) from raw 1–5 question scores.
 * Uses a direct average across all answered questions, normalised to 0–100.
 */
export function computeTotalScore(scores: Record<string, number>): number {
  const values = Object.values(scores)
  if (values.length === 0) return 0
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.round(((avg - 1) / 4) * 100)
}

/** Returns the maturity label (e.g. 'AI Enabled') for a given total score. */
export function computeCurrentStage(totalScore: number): string {
  if (totalScore <= 20) return 'AI Laggard'
  if (totalScore <= 40) return 'AI Experimenting'
  if (totalScore <= 65) return 'AI Enabled'
  if (totalScore <= 85) return 'AI Leading'
  return 'AI Native'
}

/** Returns the next maturity label, or null if already AI Native. */
export function computeNextStage(currentStage: string): string | null {
  const map: Record<string, string> = {
    'AI Laggard':       'AI Experimenting',
    'AI Experimenting': 'AI Enabled',
    'AI Enabled':       'AI Leading',
    'AI Leading':       'AI Native',
  }
  return map[currentStage] ?? null
}

/** Returns the full stage label (e.g. 'Stage 3: Connected Workflows') for a maturity label. */
export function computeMaturityStageLabel(maturityLabel: string): string {
  const map: Record<string, string> = {
    'AI Laggard':       'Stage 1: The Wild West',
    'AI Experimenting': 'Stage 2: Emerging Assistants',
    'AI Enabled':       'Stage 3: Connected Workflows',
    'AI Leading':       'Stage 4: Automated Insights',
    'AI Native':        'Stage 5: AI-First GTM Platform',
  }
  return map[maturityLabel] ?? maturityLabel
}

function getMaturity(score: number): { label: string; stage: string } {
  const label = computeCurrentStage(score)
  const stage = computeMaturityStageLabel(label)
  return { label, stage }
}

export function applyScores(
  state: BenchmarkState,
  answer: string,
  currentQuestionId: string,
  newScores: Record<string, number>
): BenchmarkState {
  const updatedAnswers = { ...state.answers, [currentQuestionId]: answer }

  // Only accept scores for active question IDs
  const validNewScores = Object.fromEntries(
    Object.entries(newScores).filter(([id]) => ACTIVE_QUESTION_IDS.includes(id))
  )
  const updatedScores = { ...state.scores, ...validNewScores }

  const answeredIds = new Set(Object.keys(updatedScores))
  const remaining = ACTIVE_QUESTION_IDS.filter(id => !answeredIds.has(id))

  const pillar1 = normalisePillar(updatedScores, ['Q1', 'Q2', 'Q3', 'Q4'])
  const pillar2 = normalisePillar(updatedScores, ['Q5', 'Q6', 'Q7'])
  const pillar3 = normalisePillar(updatedScores, ['Q8', 'Q9'])
  // Use direct average across all question scores (not pillar averages) for totalScore.
  const totalScore = computeTotalScore(updatedScores)
  const { label, stage } = getMaturity(totalScore)

  return {
    answers: updatedAnswers,
    scores: updatedScores,
    remainingQuestions: remaining,
    pillarScores: { pillar1, pillar2, pillar3 },
    totalScore,
    maturityLabel: label,
    maturityStage: stage,
  }
}
