// Pillar 1 — AI Systems for AEs
// Goal: Measure how the company uses AI to increase rep productivity and selling time.
//
// Key areas to assess:
// - Prospecting & research automation (AI-powered research, signal-based outreach)
// - Outreach & sequencing (AI-written emails, personalization at scale)
// - Call intelligence (AI notetaking, call summaries, next-step automation)
// - CRM hygiene automation (auto-logging, deal updates, activity capture)
// - Proposal & content generation (AI-assisted decks, case studies, follow-ups)
// - Time-on-selling vs admin ratio (baseline vs AI-enabled)
//
// Benchmark dimensions:
// - Tool adoption: which AI tools are AEs using?
// - System vs experimentation: are tools part of a workflow or ad hoc?
// - Coverage: what % of AEs use these tools consistently?
// - Impact measurement: does the team track AI-driven productivity gains?

export interface AESystemsData {
  // Prospecting
  usesAIProspecting: boolean
  aiProspectingTools?: string[]
  prospectingCoveragePercent?: number

  // Outreach
  usesAIOutreach: boolean
  aiOutreachTools?: string[]
  personalizationAtScale: boolean

  // Call intelligence
  usesCallIntelligence: boolean
  callIntelligenceTools?: string[]
  callSummaryAutomated: boolean

  // CRM automation
  crmAutoLogging: boolean
  crmTools?: string[]

  // Content generation
  usesAIContentGeneration: boolean

  // Time allocation
  estimatedSellingTimePercent?: number   // % of week spent actually selling
  targetSellingTimePercent?: number

  // Maturity
  systemVsExperimentation: 'none' | 'experimenting' | 'partial_system' | 'full_system'
}
