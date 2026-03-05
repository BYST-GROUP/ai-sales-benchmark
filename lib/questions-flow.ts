// Stage 2 — Benchmark Assessment: Question Flow & Branching Logic
//
// The benchmark evaluates companies across three pillars:
//   Pillar 1: AI Systems for AEs         → lib/data-needed-ae.ts
//   Pillar 2: AI Systems for Sales Leaders → lib/data-needed-leadership.ts
//   Pillar 3: AI Sales Enablement Systems  → lib/data-needed-enablement.ts
//
// Each question has:
// - A unique ID
// - The pillar it belongs to
// - Question text
// - Answer type (single select, multi select, numeric, boolean)
// - Branching rules (which question to go to next based on answer)
// - Weight for scoring
//
// Scoring:
// - Each pillar produces a score 0–100
// - Overall score is a weighted average of the three pillars
// - Scores map to maturity levels: Laggard / Emerging / Competitive / AI-Native

export type Pillar = 'ae' | 'leadership' | 'enablement'

export type AnswerType = 'single' | 'multi' | 'numeric' | 'boolean' | 'scale'

export interface Question {
  id: string
  pillar: Pillar
  text: string
  subtext?: string
  answerType: AnswerType
  options?: { label: string; value: string; score: number }[]
  weight: number
  nextQuestion?: string | ((answer: string) => string)
}

export type QuestionsFlow = Question[]

// TODO: define full question flow across all three pillars
export const questionsFlow: QuestionsFlow = []
