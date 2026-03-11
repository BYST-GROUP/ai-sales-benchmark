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

function getMaturity(score: number): { label: string; stage: string } {
  if (score <= 20) return { label: 'AI Laggard', stage: 'Stage 1: The Wild West' }
  if (score <= 40) return { label: 'AI Experimenting', stage: 'Stage 2: Emerging Assistants' }
  if (score <= 65) return { label: 'AI Enabled', stage: 'Stage 3: Connected Workflows' }
  if (score <= 85) return { label: 'AI Leading', stage: 'Stage 4: Automated Insights' }
  return { label: 'AI Native', stage: 'Stage 5: AI-First GTM Platform' }
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

  const pillar1 = normalisePillar(updatedScores, ['Q1', 'Q2', 'Q5'])
  const pillar2 = normalisePillar(updatedScores, ['Q6', 'Q8'])
  const pillar3 = normalisePillar(updatedScores, ['Q10'])
  const totalScore = Math.round((pillar1 + pillar2 + pillar3) / 3)
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
