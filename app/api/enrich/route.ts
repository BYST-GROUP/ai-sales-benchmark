import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { inferACV, inferCustomerCount, inferGTMMotion } from '@/lib/data-enrichment-logic'
import type { CompanyProfile } from '@/types'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ClaudeV2Response {
  display_name: string
  product_type: string
  gtm_motion: 'PLG' | 'SLG'
  estimated_acv: number | null
  yearly_revenue: number | null
  sales_people_count: number | null
  buyer_persona: string
  customer_segment: 'SMB' | 'Mid-Market' | 'Enterprise'
  funding_stage: string | null
  last_funding_date: string | null
  has_free_plan: boolean
  enrichment_message: string
}

async function fetchWebsiteText(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BYSTBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, '')
    const noTags = noStyles.replace(/<[^>]+>/g, ' ')
    return noTags.replace(/\s+/g, ' ').trim().slice(0, 3000)
  } catch {
    return ''
  }
}

function formatAERange(count: number): string {
  const low = Math.round(count * 0.8)
  const high = Math.round(count * 1.2)
  if (high > 1000) return '1,000+'
  return `${low}–${high}`
}

async function callClaudeV2(domain: string, websiteText: string): Promise<ClaudeV2Response> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a sharp B2B sales analyst. Given a company domain and website content, extract company information and return ONLY a valid JSON object with no preamble or markdown.

JSON schema:
{
  "display_name": "Company name",
  "product_type": "SaaS | AI | Agency | Professional Services | Info-product | Hardware",
  "gtm_motion": "PLG | SLG",
  "estimated_acv": 25000,
  "yearly_revenue": null,
  "sales_people_count": 15,
  "buyer_persona": "sales leaders, revenue ops teams",
  "customer_segment": "SMB | Mid-Market | Enterprise",
  "funding_stage": "Series B",
  "last_funding_date": "2023-06",
  "has_free_plan": false,
  "enrichment_message": "Natural language summary..."
}

Rules for structured fields:
- product_type must be exactly one of: SaaS, AI, Agency, Professional Services, Info-product, Hardware
- gtm_motion must be exactly PLG or SLG — never "Hybrid"; if hybrid, pick the dominant motion
- customer_segment must be exactly one of: SMB, Mid-Market, Enterprise — if mixed, pick the most dominant
- buyer_persona: maximum 3 personas, comma-separated
- estimated_acv: best estimate in USD as an integer; null only if truly impossible to estimate
- yearly_revenue: annual revenue in USD as an integer; null if unknown
- sales_people_count: estimated number of AEs/sales reps as an integer; null if unknown
- funding_stage: e.g. "Seed", "Series A", "Series B", "Public", null if bootstrapped or unknown
- last_funding_date: YYYY-MM format, null if unknown
- has_free_plan: true if the company offers a permanent free tier (not just a trial)

Rules for enrichment_message:
- Write a natural, conversational 2-3 sentence summary
- Use "you" and "your" throughout — never "they" or "their"
- Present findings as informed research, not facts set in stone
- Make it clear you expect them to correct anything that's off
- End with an open, natural question to confirm if your findings are correct
- If funding stage is known, mention it
- Use new lines to make the message more readable
- Describe GTM motion as "sales-led" or "product-led" — never "hybrid" or "mixed"
- Style reference (do NOT copy verbatim): "From what I can see, Brevo is a B2B SaaS company targeting mid-market sales and revenue operations teams — likely with a sales-led motion and somewhere in the range of 15–25 AEs closing deals in the $15K–$40K ACV range. Am I correct, what would you add?"
- Adapt naturally to the specific company profile — never copy the example
- Return only the message text in this field, no JSON, no markdown within the message`,
    messages: [
      {
        role: 'user',
        content: `Domain: ${domain}\n\nWebsite content:\n${websiteText || 'No website content available.'}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    return JSON.parse(text) as ClaudeV2Response
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as ClaudeV2Response
      } catch { /* ignore */ }
    }
    throw new Error('Failed to parse Claude response as JSON')
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const domain: string = body?.domain?.trim()
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }

    // Step 1: Fetch website text
    const websiteText = await fetchWebsiteText(domain)

    // Step 2: Single Claude call — infers all company data + generates enrichment message
    const claudeResponse = await callClaudeV2(domain, websiteText)

    // Step 3: Build CompanyProfile using Claude data + business logic
    const customerSegment = claudeResponse.customer_segment ?? 'Mid-Market'
    const hasFreePlan = claudeResponse.has_free_plan ?? false
    const estimatedACV = claudeResponse.estimated_acv ?? inferACV(claudeResponse.yearly_revenue, null, customerSegment)
    const estimatedCustomerCount = inferCustomerCount(claudeResponse.yearly_revenue, estimatedACV)
    const gtmMotion = inferGTMMotion(hasFreePlan, estimatedACV)
    const estimatedAECount = claudeResponse.sales_people_count
      ? formatAERange(claudeResponse.sales_people_count)
      : '—'

    const profile: CompanyProfile = {
      display_name: claudeResponse.display_name ?? domain,
      industry: claudeResponse.product_type ?? 'Unknown',
      location: 'Unknown',
      employee_count: null,
      funding_stage: claudeResponse.funding_stage ?? null,
      total_funding_raised: null,
      has_free_plan: hasFreePlan,
      product_type: claudeResponse.product_type ?? 'SaaS',
      gtm_motion: gtmMotion,
      buyer_persona: claudeResponse.buyer_persona ?? 'Unknown',
      customer_segment: customerSegment,
      estimated_acv: estimatedACV,
      estimated_ae_count: estimatedAECount,
      estimated_customer_count: estimatedCustomerCount,
    }

    console.log('[enrich-v2] company profile:', JSON.stringify(profile, null, 2))

    return NextResponse.json({ ...profile, enrichment_message: claudeResponse.enrichment_message })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[enrich-v2] error:', err)
    return NextResponse.json(
      { error: 'The benchmark is unavailable at the moment. Please try again later.', _debug: detail },
      { status: 503 }
    )
  }
}
