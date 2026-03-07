import { NextRequest, NextResponse } from 'next/server'
import { inferACV, inferCustomerCount, inferGTMMotion } from '@/lib/data-enrichment-logic'
import type { CompanyProfile } from '@/types'
import { appendLog } from '@/lib/logger'
import { getCachedEnrichment, setCachedEnrichment } from '@/lib/enrichment-cache'
import { getLLMClient, OPENAI_PROMPT_IDS, type LLMUsage } from '@/lib/llm'

export const maxDuration = 30

interface EnrichLLMResponse {
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

async function runEnrichLLM(
  domain: string,
  websiteText: string,
): Promise<{ data: EnrichLLMResponse; usage?: LLMUsage }> {
  const llm = getLLMClient()

  const { text, usage } = await llm.complete({
    promptId: OPENAI_PROMPT_IDS.enrich,
    systemPrompt: `You are a sharp B2B sales analyst. Given a company domain and website content, extract company information and return ONLY a valid JSON object with no preamble or markdown.

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
- gtm_motion must be exactly PLG or SLG or Hybrid;
- customer_segment must be exactly one of: SMB, Mid-Market, Enterprise — if mixed, pick the most dominant
- buyer_persona: maximum 3 personas, comma-separated
- estimated_acv: best estimate in USD as an integer; null only if truly impossible to estimate
- yearly_revenue: annual revenue in USD as an integer; null if unknown
- sales_people_count: estimated number of AEs/sales reps as an integer; make your best estimate using all available signals — company size, customer segment, GTM motion, funding stage, ACV, and industry norms; only return null if there is genuinely no basis for any estimate whatsoever
- funding_stage: e.g. "Seed", "Series A", "Series B", "Public", null if bootstrapped or unknown
- last_funding_date: YYYY-MM format, null if unknown
- has_free_plan: true if the company offers a permanent free tier (not just a trial)

Rules for enrichment_message:
- Start by explaining that you gathered information regarding [Company Name] so that you can benchmark it agains similar companies
- Write a natural, conversational 2-3 sentence summary
- Use "you" and "your" throughout — never "they" or "their"
- Present findings as informed research, not facts set in stone
- Make it clear you expect them to correct anything that's off
- End with an open, natural question to confirm if your findings are correct
- Always mention your estimate of the sales team size (e.g. "somewhere in the range of 8–12 AEs") — this is a key data point; if you are less confident, frame it as a rough estimate
- If funding stage is known, mention it
- Use new lines to make the message more readable
- Adapt naturally to the specific company profile
- The message needs to be straight to the point, easy to ready. Use bullet points. Use paragraphs or new lines for easier comprehension.
- Return only the message text in this field, no JSON, no markdown within the message`,
    userMessage: `Domain: ${domain}\n\nWebsite content:\n${websiteText || 'No website content available.'}`,
    maxTokens: 4096, // reasoning models use tokens for thinking before generating output
  })

  let data: EnrichLLMResponse
  try {
    data = JSON.parse(text) as EnrichLLMResponse
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        data = JSON.parse(match[0]) as EnrichLLMResponse
        return { data, usage }
      } catch { /* ignore */ }
    }
    throw new Error(`Failed to parse LLM response as JSON. Raw text (first 200 chars): ${text.slice(0, 200)}`)
  }

  return { data, usage }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const domain: string = body?.domain?.trim()
    const sessionId: string | null = body?.sessionId ?? null
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }

    // Step 1: Check cache — skip LLM entirely if fresh data exists (< 6 months old)
    const cached = await getCachedEnrichment(domain)
    if (cached) {
      await appendLog({ event: 'enrich_cache_hit', sessionId, domain })
      return NextResponse.json({ ...cached.profile, enrichment_message: cached.enrichment_message })
    }

    // Step 2: Fetch website text
    const websiteText = await fetchWebsiteText(domain)

    // Step 3: Single LLM call — infers all company data + generates enrichment message
    const { data: enrichResult, usage: tokenUsage } = await runEnrichLLM(domain, websiteText)

    // Step 4: Build CompanyProfile using LLM data + business logic
    const customerSegment = enrichResult.customer_segment ?? 'Mid-Market'
    const hasFreePlan = enrichResult.has_free_plan ?? false
    const estimatedACV = enrichResult.estimated_acv ?? inferACV(enrichResult.yearly_revenue, null, customerSegment)
    const estimatedCustomerCount = inferCustomerCount(enrichResult.yearly_revenue, estimatedACV)
    const gtmMotion = inferGTMMotion(hasFreePlan, estimatedACV)
    const estimatedAECount = enrichResult.sales_people_count
      ? formatAERange(enrichResult.sales_people_count)
      : '—'

    const profile: CompanyProfile = {
      display_name: enrichResult.display_name ?? domain,
      industry: enrichResult.product_type ?? 'Unknown',
      location: 'Unknown',
      employee_count: null,
      funding_stage: enrichResult.funding_stage ?? null,
      total_funding_raised: null,
      has_free_plan: hasFreePlan,
      product_type: enrichResult.product_type ?? 'SaaS',
      gtm_motion: gtmMotion,
      buyer_persona: enrichResult.buyer_persona ?? 'Unknown',
      customer_segment: customerSegment,
      estimated_acv: estimatedACV,
      estimated_ae_count: estimatedAECount,
      estimated_customer_count: estimatedCustomerCount,
    }

    // Step 5: Save to cache for future requests
    await setCachedEnrichment(domain, profile, enrichResult.enrichment_message)

    await appendLog({
      event: 'enrich_tokens',
      sessionId,
      domain,
      token_usage: tokenUsage ?? null,
    })

    return NextResponse.json({ ...profile, enrichment_message: enrichResult.enrichment_message })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[enrich] error:', err)
    return NextResponse.json(
      { error: 'The benchmark is unavailable at the moment. Please try again later.', _debug: detail },
      { status: 503 },
    )
  }
}
