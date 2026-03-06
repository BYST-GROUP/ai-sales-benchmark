export interface Question {
  id: string
  pillar: 1 | 2 | 3
  text: string
}

export const QUESTIONS: Question[] = [
  {
    id: 'Q1',
    pillar: 1,
    text: "How are your AEs currently using AI in their day-to-day work? Please be as detailed as possible — we'll ask fewer questions as we go based on your answer.",
  },
  {
    id: 'Q2',
    pillar: 1,
    text: "How are your call notes, next steps, and CRM fields updated after a sales meeting — is that the AE's responsibility, and are they typically up to date?",
  },
  {
    id: 'Q3',
    pillar: 1,
    text: "How do your AEs prepare for a sales meeting — what do they typically know about the prospect going in, and how do they get that information?",
  },
  {
    id: 'Q4',
    pillar: 1,
    text: "How do your AEs handle follow-ups — how are follow-up emails, proposals, and value emails put together and sent?",
  },
  {
    id: 'Q5',
    pillar: 1,
    text: "When prospects ask technical questions during the sales process — how do your AEs handle them? Do they loop in a solutions engineer, look it up themselves, or do they have tools that help them respond?",
  },
  {
    id: 'Q6',
    pillar: 2,
    text: "When a rep is underperforming — when do you actually realise it? Do you find out when the quarter is already at risk? And how do you identify the specific areas that need improvement?",
  },
  {
    id: 'Q7',
    pillar: 2,
    text: "When you look at your top performing reps — do you know what they're doing differently? And do those behaviours make it into how you coach the rest of the team?",
  },
  {
    id: 'Q8',
    pillar: 2,
    text: "How often do your AEs get feedback on what they are doing well and what they should start doing?",
  },
  {
    id: 'Q9',
    pillar: 3,
    text: "When a new AE joins — what does the onboarding process look like?",
  },
  {
    id: 'Q10',
    pillar: 3,
    text: "Are your AEs using the playbooks you've built — if you've built any? And do they have competitor battlecards they can easily use to win deals?",
  },
]

export const QUESTION_MAP: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map(q => [q.id, q])
)

export const ALL_QUESTION_IDS = QUESTIONS.map(q => q.id)
