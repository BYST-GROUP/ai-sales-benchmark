// Pillar 3 — AI Sales Enablement Systems
// Goal: Measure how the company uses AI to coach and train talent,
//       creating a consistent system for turning average talent into top performers.
//
// Key areas to assess:
// - Onboarding & ramp time (AI-assisted onboarding, knowledge bases, simulations)
// - Playbook & methodology (is there a documented, AI-reinforced sales methodology?)
// - Objection handling (AI-powered objection libraries, real-time coaching)
// - Content & collateral (AI-generated sales assets, up-to-date battlecards)
// - Skill development (AI role-play, rep self-coaching tools)
// - Knowledge management (searchable sales knowledge base, AI Q&A for reps)
//
// Benchmark dimensions:
// - Systematization: is enablement codified or tribal knowledge?
// - Consistency: do all reps have access to the same training and tools?
// - AI leverage: is AI used to scale what the best reps do?
// - Ramp speed: how long does it take a new AE to reach full productivity?

export interface EnablementSystemsData {
  // Onboarding
  hasStructuredOnboarding: boolean
  avgRampTimeDays?: number
  targetRampTimeDays?: number
  usesAIForOnboarding: boolean

  // Playbook & methodology
  hasDocumentedPlaybook: boolean
  playbookFormat: 'none' | 'doc' | 'notion' | 'dedicated_tool' | 'ai_reinforced'
  repsFollowPlaybookPercent?: number

  // Objection handling
  hasObjectionLibrary: boolean
  objectionLibraryUpdatedRecently: boolean
  usesAIForObjectionCoaching: boolean

  // Content & collateral
  hasUpToDateBattlecards: boolean
  usesAIForContentGeneration: boolean
  contentFreshnessLagDays?: number

  // Skill development
  usesAIRolePlay: boolean
  rolePlayFrequency: 'never' | 'quarterly' | 'monthly' | 'weekly'

  // Knowledge management
  hasSearchableSalesKnowledgeBase: boolean
  repsCanFindAnswersWithoutManager: boolean

  // Maturity
  enablementOwner: 'none' | 'manager_led' | 'dedicated_person' | 'ai_system'
}
