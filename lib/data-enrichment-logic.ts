// Stage 1.1 — AI Company Data Enrichment Logic
// Given a company domain, this module extracts company information
// to pre-populate the benchmark and qualify the lead.

import type { EnrichmentProfile } from '@/app/api/enrich/route'

export type { EnrichmentProfile }

// Legacy interface kept for backward compatibility
export interface CompanyProfile {
  domain: string
  name?: string
  industry?: string
  arrRange?: string
  headcount?: number
  aeCount?: number
  crm?: string
  aiToolsDetected?: string[]
  fundingStage?: string
  confidence: 'high' | 'medium' | 'low'
}

function val(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === '') return '[unknown]'
  return String(v)
}

export function formatEnrichmentMessage(profile: EnrichmentProfile): string {
  return (
    `Here's what I found about ${val(profile.display_name)}.\n\n` +
    `It's a ${val(profile.industry)} company that serves ${val(profile.customer_segment)} customers and sells to ${val(profile.buyer_persona)}.\n\n` +
    `From a sales go-to-market perspective, it runs a ${val(profile.gtm_motion)} motion, and has approximately ${val(profile.estimated_ae_count)} account executives with an estimated ACV in the ${val(profile.estimated_acv_range)} range.\n\n` +
    `Does this sound right? Feel free to correct anything before we start.`
  )
}
