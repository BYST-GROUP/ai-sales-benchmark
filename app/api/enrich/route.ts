import { NextRequest, NextResponse } from 'next/server'
import { inferACV, inferCustomerCount, inferGTMMotion } from '@/lib/data-enrichment-logic'
import type { CompanyProfile } from '@/types'
import { appendLog } from '@/lib/logger'
import { getCachedEnrichment, setCachedEnrichment } from '@/lib/enrichment-cache'
import { getLLMClient, OPENAI_PROMPT_IDS, LLM_PROVIDER, createOpenAIConversation, type LLMUsage } from '@/lib/llm'

export const maxDuration = 60

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
  confirmed?: boolean
}

// ─── Prompts ───────────────────────────────────────────────────────────────────

const ENRICH_SYSTEM_PROMPT = `You are a sharp B2B sales analyst. Given a company domain and website content, extract company information and return ONLY a valid JSON object with no preamble or markdown.

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
- gtm_motion must be exactly PLG or SLG or Hybrid
- customer_segment must be exactly one of: SMB, Mid-Market, Enterprise — if mixed, pick the most dominant
- buyer_persona: maximum 3 personas, comma-separated
- estimated_acv: best estimate in USD as an integer; null only if truly impossible to estimate
- yearly_revenue: annual revenue in USD as an integer; null if unknown
- sales_people_count: estimated number of AEs/sales reps as an integer; make your best estimate using all available signals — company size, customer segment, GTM motion, funding stage, ACV, and industry norms; only return null if there is genuinely no basis for any estimate whatsoever
- funding_stage: e.g. "Seed", "Series A", "Series B", "Public", null if bootstrapped or unknown
- last_funding_date: YYYY-MM format, null if unknown
- has_free_plan: true if the company offers a permanent free tier (not just a trial)

Rules for enrichment_message:
- Start by explaining that you gathered information regarding / researched about [Company Name] so that we can benchmark it against similar companies — use a new line after this sentence
- Write a natural, conversational summary
- Use "you" and "your" throughout — never "they" or "their"
- Present findings using bullet points
- End with an open, natural question to confirm if your findings are correct
- When known, mention the following data points in this order:
  1) Company type
  2) GTM motion
  3) Estimated ACV — if less confident, frame it as a rough estimate
  4) Estimated Revenue — if less confident, frame it as a rough estimate; skip if unknown
  5) Estimated sales team size — always include your best estimate; if less confident, frame it as a rough estimate
- If funding stage is known, mention it
- Use new lines after every sentence
- Adapt naturally to the specific company profile
- Keep it straight to the point and easy to read — use bullet points, paragraphs, and new lines for easier comprehension
- Return only the message text in this field — no JSON, no markdown within the message
- Do not mention the free plan in the enrichment message
- If you face any error during enrichment do not mention it in the output message`

// Used by the Anthropic path for follow-up calls.
// For OpenAI, instructions are embedded in the user message (stored prompts ignore systemPrompt).
const FOLLOW_UP_SYSTEM_PROMPT = `You are a sharp B2B sales analyst handling a user's reply to a company enrichment summary. Return ONLY a valid JSON object with no preamble or markdown.`

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function parseEnrichJSON(text: string): EnrichLLMResponse {
  try {
    return JSON.parse(text) as EnrichLLMResponse
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as EnrichLLMResponse
    throw new Error(`Failed to parse LLM response as JSON. Raw (first 200): ${text.slice(0, 200)}`)
  }
}

// ─── LLM calls ─────────────────────────────────────────────────────────────────

async function runEnrichLLM(
  domain: string,
  websiteText: string,
): Promise<{ data: EnrichLLMResponse; usage?: LLMUsage }> {
  const llm = getLLMClient()
  const { text, usage } = await llm.complete({
    promptId: OPENAI_PROMPT_IDS.enrich,
    systemPrompt: ENRICH_SYSTEM_PROMPT,
    userMessage: `Domain: ${domain}\n\nWebsite content:\n${websiteText || 'No website content available.'}`,
    maxTokens: 4096,
  })
  return { data: parseEnrichJSON(text), usage }
}

/**
 * Handles a user's reply to the enrichment message.
 * Detects whether they are confirming or correcting, updates the snapshot if needed,
 * and returns { confirmed, enrichment_message, ...updatedFields }.
 */
async function runFollowUpLLM(
  userMessage: string,
  companySnapshot: Record<string, unknown>,
): Promise<{ data: EnrichLLMResponse & { confirmed: boolean }; usage?: LLMUsage }> {
  const llm = getLLMClient()

  const followUpUserMessage = `FOLLOW-UP MODE — process the user's reply to the enrichment summary.

Current company snapshot:
${JSON.stringify(companySnapshot, null, 2)}

User's reply: "${userMessage}"

Instructions:
1. Determine the user's intent:
   - CONFIRMING: any form of yes / correct / good / ok / looks good / sounds right / perfect / accurate / yep / sure / great / all good / seems right → set "confirmed": true
   - CORRECTING or QUESTIONING: user provides updated info or asks a question → set "confirmed": false

2. If CONFIRMING:
   - Set "confirmed": true
   - Set "enrichment_message" to a brief warm one-liner (e.g. "Perfect — let's get started!")
   - Return all snapshot fields unchanged

3. If CORRECTING or QUESTIONING:
   - Set "confirmed": false
   - Apply the correction to the relevant snapshot field(s)
   - Set "enrichment_message" to: one sentence acknowledging the correction or answering the question, then end with "Does everything look accurate now, or is there anything else to update?"
   - Leave all other fields unchanged

Return ONLY a valid JSON object using the exact same schema as the snapshot, plus "confirmed": boolean. No preamble, no markdown.`

  const { text, usage } = await llm.complete({
    promptId: OPENAI_PROMPT_IDS.enrich,
    systemPrompt: FOLLOW_UP_SYSTEM_PROMPT,
    userMessage: followUpUserMessage,
    maxTokens: 1024,
  })

  const data = parseEnrichJSON(text) as EnrichLLMResponse & { confirmed: boolean }
  // Ensure confirmed is always present — default to false if the LLM omitted it
  if (typeof data.confirmed !== 'boolean') data.confirmed = false
  return { data, usage }
}

// ─── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sessionId: string | null = body?.sessionId ?? null

    // ── Follow-up mode: user replied to the enrichment message ──────────────────
    if (body?.mode === 'follow_up') {
      const userMessage: string = body?.userMessage?.trim() ?? ''
      const companySnapshot: Record<string, unknown> = body?.companySnapshot ?? {}

      if (!userMessage) {
        return NextResponse.json({ error: 'userMessage is required for follow_up mode' }, { status: 400 })
      }

      const { data, usage } = await runFollowUpLLM(userMessage, companySnapshot)

      await appendLog({
        event: 'enrich_follow_up',
        sessionId,
        userMessage,
        confirmed: data.confirmed,
        token_usage: usage ?? null,
      })

      return NextResponse.json(data)
    }

    // ── Initial enrichment mode ──────────────────────────────────────────────────
    const domain: string = body?.domain?.trim()
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }

    // Step 1: Check cache — skip LLM entirely if fresh data exists (< 6 months old)
    const cached = await getCachedEnrichment(domain)
    if (cached) {
      await appendLog({ event: 'enrich_cache_hit', sessionId, domain })
      const conversationId = LLM_PROVIDER === 'openai' ? await createOpenAIConversation() : undefined
      return NextResponse.json({
        ...cached.profile,
        enrichment_message: cached.enrichment_message,
        ...(conversationId ? { conversationId } : {}),
      })
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

    // Pre-create an OpenAI conversation so the first benchmark turn skips the extra round-trip.
    const conversationId = LLM_PROVIDER === 'openai' ? await createOpenAIConversation() : undefined

    return NextResponse.json({
      ...profile,
      enrichment_message: enrichResult.enrichment_message,
      // Return raw LLM fields so the client can store them as a snapshot for follow-up corrections
      _snapshot: enrichResult,
      ...(conversationId ? { conversationId } : {}),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[enrich] error:', err)
    return NextResponse.json(
      { error: 'The benchmark is unavailable at the moment. Please try again later.', _debug: detail },
      { status: 503 },
    )
  }
}
