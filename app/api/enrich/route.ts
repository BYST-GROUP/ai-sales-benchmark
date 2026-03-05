import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildCompanyProfile, formatEnrichmentMessage } from '@/lib/data-enrichment-logic'
import type { CompanyProfile } from '@/types'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PdlData {
  display_name?: string
  size?: string
  employee_count?: number
  industry?: string
  location?: { name?: string }
  total_funding_raised?: number
  latest_funding_stage?: string
  last_funding_date?: string
  summary?: string
  website?: string
}

interface ClaudeInference {
  product_type?: string
  buyer_persona?: string
  customer_segment?: string
}

async function fetchPdlData(domain: string): Promise<PdlData | null> {
  try {
    const res = await fetch(
      `https://api.peopledatalabs.com/v5/company/enrich?website=${domain}`,
      { headers: { 'X-Api-Key': process.env.PDL_API_KEY ?? '' } }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json || json.status === 404) return null
    return json as PdlData
  } catch {
    return null
  }
}

async function callClaude(pdlData: PdlData | null, websiteText: string): Promise<ClaudeInference> {
  const companyContext = pdlData
    ? `Company data from PDL:
${JSON.stringify({
  display_name: pdlData.display_name,
  size: pdlData.size,
  employee_count: pdlData.employee_count,
  industry: pdlData.industry,
  location: pdlData.location?.name,
  summary: pdlData.summary,
}, null, 2)}`
    : 'No structured company data available.'

  const userMessage = `${companyContext}

Website content:
${websiteText || 'No website content available.'}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: `You are a B2B sales analyst. Based on the company data and website content provided, infer the following and return ONLY a valid JSON object with no preamble or markdown:
{
  "product_type": "SaaS | AI | Agency | Professional Services | Info-product | Hardware",
  "buyer_persona": "e.g. marketing teams, sales leaders, finance teams (maximum 3 personas, comma-separated)",
  "customer_segment": "SMB | Mid-Market | Enterprise"
}
Rules:
- product_type must be exactly one of: SaaS, AI, Agency, Professional Services, Info-product, Hardware — do not use the PDL industry field or any other value
- buyer_persona must list a maximum of 3 personas, separated by commas
- customer_segment must be exactly one of: SMB, Mid-Market, Enterprise
Base your inference on: case studies, messaging tone, pricing page language, and company size signals.`,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    return JSON.parse(text) as ClaudeInference
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as ClaudeInference } catch { /* ignore */ }
    }
    return {}
  }
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
    const clean = noTags.replace(/\s+/g, ' ').trim()
    return clean.slice(0, 3000)
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const domain: string = body?.domain?.trim()
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }

    // Step 1: PDL
    const pdlData = await fetchPdlData(domain)

    // Step 2: Website text (for Claude context)
    const websiteText = await fetchWebsiteText(domain)

    // Step 3: Claude infers buyer_persona and customer_segment only
    const claudeInference = await callClaude(pdlData, websiteText)

    // Step 4: Build complete profile using business logic functions
    const profile: CompanyProfile = await buildCompanyProfile(pdlData, claudeInference, domain)

    // Step 5: Generate the natural language summary server-side
    const enrichment_message = await formatEnrichmentMessage(profile)

    return NextResponse.json({ ...profile, enrichment_message })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('Enrichment error:', err)
    return NextResponse.json(
      { error: 'The benchmark is unavailable at the moment. Please try again later.', _debug: detail },
      { status: 503 }
    )
  }
}
