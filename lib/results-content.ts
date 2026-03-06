export type MaturityLabel =
  | 'AI Laggard'
  | 'AI Experimenting'
  | 'AI Enabled'
  | 'AI Leading'
  | 'AI Native'

export interface CurrentStageContent {
  whatYoureDoing: string
  whatYoureExperiencing: string
}

export interface ImpactStat {
  label: string
  value: string
}

export interface NextStageContent {
  title: string
  whatItLooksLike: string
  whyItMatters: string
  impactStats: ImpactStat[]
}

export const CURRENT_STAGE_CONTENT: Record<MaturityLabel, CurrentStageContent> = {
  'AI Laggard': {
    whatYoureDoing:
      "Your team is experimenting with AI individually — a rep here, a manager there — but there's no shared system, no standard, and no way to measure what's working.",
    whatYoureExperiencing:
      "Inconsistent output quality, manual admin burden slowing your reps down, and no visibility into what your best people are doing differently.",
  },
  'AI Experimenting': {
    whatYoureDoing:
      "Some of your team have adopted AI tools and are seeing early wins — but adoption is uneven and the tools aren't connected to each other or to your CRM.",
    whatYoureExperiencing:
      "Pockets of productivity, but no scalable system. The gains depend on individual initiative rather than organisational design.",
  },
  'AI Enabled': {
    whatYoureDoing:
      "You have defined AI tools across your team, integrated into your core workflows. Reps are working faster, CRM data is more reliable, and your processes are starting to become repeatable.",
    whatYoureExperiencing:
      "Operational consistency and measurable productivity gains — but you're still largely reactive. Your AI systems tell you what happened, not what's about to happen.",
  },
  'AI Leading': {
    whatYoureDoing:
      "AI is embedded across your GTM motion. Your systems surface insights proactively, flag risks before they become problems, and help your team make better decisions faster.",
    whatYoureExperiencing:
      "Predictive pipeline visibility, faster rep ramp times, and a coaching system that scales. Your team spends more time selling and less time guessing.",
  },
  'AI Native': {
    whatYoureDoing:
      "AI is the connective tissue of your entire sales organisation. Every workflow — from prospecting to renewals — is orchestrated end-to-end with no manual triggers required.",
    whatYoureExperiencing:
      "Full operational leverage. Your team operates at a level that's structurally difficult for competitors without the same systems to replicate.",
  },
}

export const NEXT_STAGE_CONTENT: Record<MaturityLabel, NextStageContent | null> = {
  'AI Laggard': {
    title: 'AI Experimenting',
    whatItLooksLike:
      "Your team starts adopting shared AI tools with a consistent standard. Call recording is in place, reps have AI-assisted follow-up workflows, and managers have visibility into what's working.",
    whyItMatters:
      "Moving from ad-hoc to structured AI adoption is where the first measurable productivity gains appear — typically 20–30% reduction in admin time per rep.",
    impactStats: [
      { label: 'Admin time saved', value: '~1.5 hrs/rep/day' },
      { label: 'Selling time increase', value: '+25% per rep' },
      { label: 'OTE to Quota multiple lift', value: '+10–15%' },
      { label: 'Win rate improvement', value: '+8–12%' },
    ],
  },
  'AI Experimenting': {
    title: 'AI Enabled',
    whatItLooksLike:
      "Your AI tools are connected to your CRM. Summaries, next steps, and CRM fields update automatically after every call. Reps start every meeting with an AI-generated brief.",
    whyItMatters:
      "This is the stage where selling time increases meaningfully — reps stop losing hours to admin and start spending that time with prospects.",
    impactStats: [
      { label: 'Admin time saved', value: '~2.5 hrs/rep/day' },
      { label: 'Selling time increase', value: '+35% per rep' },
      { label: 'OTE to Quota multiple lift', value: '+15–20%' },
      { label: 'Ramp time reduction', value: '30–40% faster' },
    ],
  },
  'AI Enabled': {
    title: 'AI Leading',
    whatItLooksLike:
      "AI surfaces insights proactively — deal risk alerts, coaching signals, win pattern analysis. Your managers stop reacting and start leading with data.",
    whyItMatters:
      "Teams at this stage see significantly better forecast accuracy and faster identification of underperforming reps — before the quarter is already at risk.",
    impactStats: [
      { label: 'Admin time saved', value: '~3.5 hrs/rep/day' },
      { label: 'OTE to Quota multiple lift', value: '+20–25%' },
      { label: 'Forecast accuracy', value: '+20% improvement' },
      { label: 'Win rate improvement', value: '+18–25%' },
    ],
  },
  'AI Leading': {
    title: 'AI Native',
    whatItLooksLike:
      "Every GTM workflow runs automatically. Prospecting, outreach, follow-up, coaching, and forecasting all happen with AI as the operating layer — not a tool on top.",
    whyItMatters:
      "AI Native organisations compound their advantage over time. The system gets smarter with every deal, every call, and every rep interaction.",
    impactStats: [
      { label: 'Admin time saved', value: '4+ hrs/rep/day' },
      { label: 'Pipeline capacity', value: '2× per rep' },
      { label: 'OTE to Quota multiple lift', value: '+35–40%' },
      { label: 'Win rate improvement', value: '+30%+' },
    ],
  },
  'AI Native': null,
}
