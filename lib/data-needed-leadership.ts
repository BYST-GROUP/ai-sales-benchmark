// Pillar 2 — AI Systems for Sales Leaders
// Goal: Measure how the company uses AI to improve decision-making, coaching, and pipeline visibility.
//
// Key areas to assess:
// - Pipeline visibility (AI-powered forecasting, deal health scoring)
// - Coaching & rep development (AI call review, pattern recognition, rep benchmarking)
// - Performance analytics (AI dashboards, leading indicator tracking)
// - Deal inspection (AI deal risk signals, stakeholder mapping)
// - Revenue intelligence (win/loss analysis, market signals)
// - Decision-making speed (how quickly leaders can act on pipeline data)
//
// Benchmark dimensions:
// - Visibility: does the leader have real-time, accurate pipeline data?
// - Coaching leverage: can the leader coach more reps more effectively with AI?
// - Forecast accuracy: what is current forecast accuracy, and is AI improving it?
// - Proactivity: does the leader catch deal risk before it's too late?

export interface LeadershipSystemsData {
  // Pipeline visibility
  hasPipelineVisibility: boolean
  forecastingMethod: 'gut' | 'spreadsheet' | 'crm_reports' | 'ai_forecasting'
  forecastAccuracyPercent?: number

  // Coaching
  usesAIForCoaching: boolean
  coachingFrequency: 'never' | 'monthly' | 'weekly' | 'daily'
  canReviewAllRepCalls: boolean
  aiCallReviewTools?: string[]

  // Performance analytics
  hasLeadingIndicatorDashboard: boolean
  reviewsActivityDataWeekly: boolean

  // Deal inspection
  usesAIDealRiskSignals: boolean
  avgDealVisibilityLagDays?: number   // how many days before leader spots a deal at risk

  // Revenue intelligence
  tracksWinLossReasons: boolean
  usesAIForWinLossAnalysis: boolean

  // Maturity
  leaderTimeOnCoachingHoursPerWeek?: number
  targetLeaderTimeOnCoachingHoursPerWeek?: number
}
