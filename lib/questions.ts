export interface Question {
  id: string
  pillar: 1 | 2 | 3
  text: string
  options?: string[]
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
    options: [
      "AEs update the CRM manually — when they remember to",
      "We record calls with a tool like Gong or Fireflies, but CRM is still updated manually",
      "Call notes and CRM fields are updated automatically after every meeting",
    ],
  },
  {
    id: 'Q3',
    pillar: 1,
    text: "How do your AEs prepare for a sales meeting — what do they typically know about the prospect going in, and how do they get that information?",
    options: [
      "They check the CRM and browse the company website",
      "They use LinkedIn, news, and ChatGPT to build their own prep",
      "They receive an automated AI prep brief before every call",
    ],
  },
  {
    id: 'Q5',
    pillar: 1,
    text: "When prospects ask technical questions during the sales process — how do your AEs handle them? Do they loop in a solutions engineer, look it up themselves, or do they have tools that help them respond?",
    options: [
      "They loop in a solutions engineer or follow up after the call",
      "They look it up themselves or use ChatGPT to draft a response",
      "They have a real-time AI tool that surfaces answers during the call",
    ],
  },
  {
    id: 'Q6',
    pillar: 2,
    text: "When a rep is underperforming — when do you actually realise it? Do you find out when the quarter is already at risk? And how do you identify the specific areas that need improvement?",
    options: [
      "Usually when the quarter is already at risk",
      "We check CRM data and listen to recordings periodically",
      "We have dashboards that flag warning signals before it becomes a pipeline problem",
    ],
  },
  {
    id: 'Q7',
    pillar: 2,
    text: "When you look at your top performing reps — do you know what they're doing differently? And do those behaviours make it into how you coach the rest of the team?",
    options: [
      "Not really — it's mostly gut feel and experience",
      "We listen to their calls occasionally and share learnings ad hoc",
      "Yes — we analyse their patterns and systematically coach the rest of the team from that",
    ],
  },
  {
    id: 'Q8',
    pillar: 2,
    text: "How often do your AEs get feedback on what they are doing well and what they should start doing?",
    options: [
      "Mainly during 1:1s or quarterly reviews",
      "A few times a month when we flag specific calls to review",
      "Regularly, with structured AI-generated coaching summaries per rep",
    ],
  },
  {
    id: 'Q9',
    pillar: 3,
    text: "When a new AE joins — what does the onboarding process look like?",
    options: [
      "They shadow senior reps and ramp over 3–6 months",
      "We have a structured plan with recorded calls and written playbooks",
      "We have an AI-powered onboarding with call simulations and objection training",
    ],
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
