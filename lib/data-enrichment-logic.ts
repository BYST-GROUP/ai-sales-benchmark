// Stage 1.1 — AI Company Data Enrichment Logic
// Given a company domain, this module extracts company information
// to pre-populate the benchmark and qualify the lead.

import Anthropic from '@anthropic-ai/sdk'
import type { CompanyProfile } from '@/types'

export type { CompanyProfile }

const ACV_BENCHMARKS: Record<string, number> = {
  SMB: 9000,
  'Mid-Market': 30000,
  Enterprise: 100000,
}

function stripHtml(html: string): string {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, '')
  const noTags = noStyles.replace(/<[^>]+>/g, ' ')
  return noTags.replace(/\s+/g, ' ').trim()
}

export async function detectFreePlan(domain: string): Promise<boolean> {
  try {
    const [pricingRes, homepageRes] = await Promise.allSettled([
      fetch(`https://${domain}/pricing`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BYSTBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://${domain}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BYSTBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      }),
    ])

    let combined = ''
    if (pricingRes.status === 'fulfilled' && pricingRes.value.ok) {
      combined += stripHtml(await pricingRes.value.text())
    }
    if (homepageRes.status === 'fulfilled' && homepageRes.value.ok) {
      combined += ' ' + stripHtml(await homepageRes.value.text())
    }

    return /free/i.test(combined)
  } catch {
    return false
  }
}

export function inferACV(
  revenue: number | null,
  customerCount: number | null,
  customerSegment: string
): number {
  if (revenue !== null && customerCount !== null && customerCount > 0) {
    return revenue / customerCount
  }
  if (revenue !== null && customerCount === null) {
    const benchmark = ACV_BENCHMARKS[customerSegment]
    if (benchmark !== undefined) return benchmark
  }
  return ACV_BENCHMARKS[customerSegment] ?? ACV_BENCHMARKS['Mid-Market']
}

export function inferCustomerCount(revenue: number | null, acv: number): number | null {
  if (revenue === null || acv === 0) return null
  return Math.round((revenue / acv) / 10) * 10
}

export function inferGTMMotion(hasFreePlan: boolean, estimatedACV: number): 'PLG' | 'SLG' {
  if (hasFreePlan) {
    return estimatedACV < 15000 ? 'PLG' : 'SLG'
  } else {
    return estimatedACV <= 10000 ? 'PLG' : 'SLG'
  }
}

export function inferAECount(employeeCount: number, gtmMotion: string): string {
  if (gtmMotion === 'PLG') {
    const base = Math.round(employeeCount * 0.03)
    const high = Math.round(base * 1.2)
    if (high > 1000) return '1,000+'
    return `${Math.round(base * 0.8)}–${high}`
  }
  // SLG: midpoint of 6%–9% is 7.5%, apply ±20%
  const midpoint = Math.round(employeeCount * 0.075)
  const high = Math.round(midpoint * 1.2)
  if (high > 1000) return '1,000+'
  return `${Math.round(midpoint * 0.8)}–${high}`
}

export async function buildCompanyProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdlData: any,
  claudeInference: { product_type?: string; buyer_persona?: string; customer_segment?: string },
  domain: string
): Promise<CompanyProfile> {
  const hasFreePlan = await detectFreePlan(domain)

  const customerSegment = (claudeInference.customer_segment ?? 'Mid-Market') as CompanyProfile['customer_segment']
  const employeeCount: number | null = pdlData?.employee_count ?? null

  const estimatedACV = inferACV(null, null, customerSegment)
  const estimatedCustomerCount = inferCustomerCount(null, estimatedACV)
  const gtmMotion = inferGTMMotion(hasFreePlan, estimatedACV)
  const estimatedAECount = inferAECount(employeeCount ?? 0, gtmMotion)

  return {
    display_name: pdlData?.display_name ?? domain,
    industry: pdlData?.industry ?? 'Unknown',
    location: pdlData?.location?.name ?? 'Unknown',
    employee_count: employeeCount,
    funding_stage: pdlData?.latest_funding_stage ?? null,
    total_funding_raised: pdlData?.total_funding_raised ?? null,
    has_free_plan: hasFreePlan,
    product_type: claudeInference.product_type ?? 'SaaS',
    gtm_motion: gtmMotion,
    buyer_persona: claudeInference.buyer_persona ?? 'Unknown',
    customer_segment: customerSegment,
    estimated_acv: estimatedACV,
    estimated_ae_count: estimatedAECount,
    estimated_customer_count: estimatedCustomerCount,
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function formatEnrichmentMessage(profile: CompanyProfile): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are a sharp B2B sales analyst presenting your research on a company to its own sales leader or founder.
Your job is to show them what you found — confidently but humbly. You've done your homework, but you know you might have some details wrong. You want them to confirm, correct, or fill in what you missed.

Write a natural, conversational 2-3 sentence summary that:
- Uses "you" and "your" throughout — never "they" or "their"
- Presents your findings as informed research, not facts set in stone
- Makes it clear you expect them to correct anything that's off
- Ends with an open, natural question to confirm if your findings are correct.
- If you have that information share your findings regarding funding stage.
Here is an example of the right tone — do NOT copy it verbatim, use it only as a style reference:

"From what I can see, Brevo is a B2B SaaS company targeting mid-market sales and revenue operations teams — likely with a sales-led motion and somewhere in the range of 15–25 AEs closing deals in the $15K–$40K ACV range. Am I correct, what would you add?"

Adapt naturally to the specific company profile. Never copy the example. Return only the message text, no JSON, no markdown.

Rules:
- Adapt language and flow to the specific company type and profile
- product_type must be one of: SaaS, AI, Agency, Professional Services, Info-product, Hardware
- Present a maximum of 3 buyer personas
- GTM motion is either sales-led or product-led — never describe it as "hybrid" or "mixed"
- customer_segment is either SMB, Mid-Market, or Enterprise — never "mixed"
- If the company serves multiple segments, pick the most dominant one
- If the GTM motion is hybrid, default to whichever motion is most dominant — sales-led or product-led
- End with a short, natural conversational question.
- Structure your message using paragraphs — maximum 2 sentences per paragraph. Add a new line between each paragraph for readability.
- Return only the message text, no JSON, no markdown`,
    messages: [
      {
        role: 'user',
        content: `Company profile:\n${JSON.stringify(profile, null, 2)}`,
      },
    ],
  })

  return message.content[0].type === 'text'
    ? message.content[0].text
    : `From what I can see, you're running a ${profile.product_type} business targeting ${profile.customer_segment} buyers with a ${profile.gtm_motion === 'SLG' ? 'sales-led' : 'product-led'} motion. What would you correct?`
}
