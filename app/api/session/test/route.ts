import { NextResponse } from 'next/server'
import type { BenchmarkState, BenchmarkReport } from '@/lib/benchmark-state'

/**
 * GET /api/session/test
 *
 * Returns hardcoded benchmark state + report for dev/design previewing.
 * Navigate to /benchmark/session/test to see the full results page instantly.
 */

const benchmarkState: BenchmarkState = {
  answers: {
    Q1:  "We use ChatGPT and our call intelligence tool for call summaries and follow-up drafts, but it's mostly individual usage rather than a company-wide workflow.",
    Q2:  "Our call recording tool pushes notes and summaries into the CRM after meetings, but reps still manually update next steps, deal stages, and some fields.",
    Q5:  "When reps need product or technical information they check internal docs, previous deals in the CRM, or ask a solution engineer.",
    Q6:  "We track rep performance through CRM dashboards — pipeline coverage, activity levels, and stage progression.",
    Q8:  "Coaching is based on call reviews and pipeline reviews. Managers review recordings and give feedback during 1-on-1s.",
    Q10: "We have playbooks but adoption is mixed. Top performers rely on their own methods while newer reps use the playbooks more.",
  },
  scores: {
    Q1: 2, Q2: 3, Q5: 2,
    Q6: 3, Q8: 2,
    Q10: 2,
  },
  remainingQuestions: [],
  pillarScores: { pillar1: 33, pillar2: 37, pillar3: 25 },
  totalScore: 32,
  maturityLabel: 'AI Experimenting',
  maturityStage: 'Stage 2: Emerging Assistants',
}

const benchmarkReport: BenchmarkReport = {
  pillarScores: { pillar1: 33, pillar2: 37, pillar3: 25 },
  totalScore: 32,
  maturityLabel: 'AI Experimenting',
  maturityStage: 'Stage 2: Emerging Assistants',
  currentStage: {
    whatItLooksLike:
      "Your reps are using ChatGPT and a call intelligence tool for individual tasks like summarising calls and drafting follow-ups, but these tools aren't connected to a shared standard or workflow. CRM automation partially exists — call summaries push in automatically — but next steps, deal stages, and key fields still require manual rep input after every meeting.",
    theProblem:
      "Because AI adoption depends on individual initiative rather than organisational design, output quality varies significantly across the team. Managers are flying blind on rep performance until the quarter is already at risk, and new hires ramp slowly because the playbook adoption is inconsistent — top performers have built their own systems that aren't transferable.",
  },
  nextStage: {
    title: 'AI Enabled',
    whatItLooksLike:
      "Your AI tools become connected to your CRM as a single operating layer. Every call automatically updates next steps, deal stage, and relevant fields — no manual entry. Reps start each meeting with an AI-generated brief, and managers have a live, normalised view of performance signals rather than waiting for dashboard snapshots.",
    whyItMatters:
      "This is the stage where selling time increases meaningfully — reps stop losing 2–3 hours a day to admin and redirect that capacity to pipeline. It also makes your playbook stickier because AI surfaces the right content in context, rather than requiring reps to go looking for it.",
    impactStats: [
      { label: 'Admin time saved',       value: '~2.5 hrs/rep/day' },
      { label: 'Selling time increase',  value: '+35% per rep' },
      { label: 'OTE to Quota lift',      value: '+15–20%' },
      { label: 'Ramp time reduction',    value: '30–40% faster' },
    ],
  },
}

export async function GET() {
  return NextResponse.json({ benchmarkState, benchmarkReport, domain: 'example.com' })
}
