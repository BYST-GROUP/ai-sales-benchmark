// Stage 4 — CTA & Pitch Logic
// After the 4-phase output, the application presents the BYST Sales Systems offer.
//
// Structure:
//   1. Realization moment — anchor the cost of inaction
//   2. The BYST promise — what we do and for whom
//   3. Social proof / credibility signals
//   4. Primary CTA — Book a call
//   5. Secondary CTA — Download report / Share results
//
// Personalization:
//   - CTA copy adapts to maturity tier (Laggard gets urgency, Competitive gets opportunity)
//   - Pitch angle adapts to primary gap (AE productivity vs Leadership vs Enablement)
//
// Booking integration:
//   - Primary CTA links to a Calendly / Cal.com booking page
//   - Lead data (company, score, answers) passed as URL params or via webhook
//     so the sales team is pre-briefed before the call

export interface CTAConfig {
  headline: string
  subheadline: string
  primaryCTA: {
    label: string
    url: string
  }
  secondaryCTA?: {
    label: string
    action: 'download_report' | 'share_results' | 'email_results'
  }
  pitchPoints: string[]
  urgencyStatement: string
}

export const bookingUrl = 'https://calendly.com/byst-group/ai-sales-benchmark'  // TODO: confirm URL

export function getCTAConfig(
  tier: 'laggard' | 'emerging' | 'competitive' | 'ai_native',
  primaryGap: 'ae' | 'leadership' | 'enablement'
): CTAConfig {
  // TODO: implement personalized CTA copy per tier and primary gap
  throw new Error('Not implemented')
}

// Static pitch copy — BYST Sales Systems offer
export const bystPitch = {
  tagline: 'We build AI Sales Systems for B2B SaaS companies.',
  whoWeHelp: 'Founders and Sales Leaders with 3–20 AEs who want to build a competitive, AI-native sales organization — without months of internal experimentation.',
  whatWeDeliver: [
    'AI systems for AEs that increase selling time and pipeline quality',
    'AI systems for Sales Leaders that improve coaching and forecast accuracy',
    'AI-enabled enablement that turns average reps into consistent top performers',
  ],
  howWeWork: 'We implement proven AI sales systems in 90 days — so you don\'t have to figure it out yourself.',
  socialProof: [] as string[],  // TODO: add client results / testimonials
}
