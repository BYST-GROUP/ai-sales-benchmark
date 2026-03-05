import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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
  gtm_motion?: string
  buyer_persona?: string
  customer_segment?: string
  estimated_ae_count?: number
  estimated_acv_range?: string
  estimated_customer_count?: string
}

export interface EnrichmentProfile {
  domain: string
  display_name?: string
  size?: string
  employee_count?: number
  industry?: string
  location?: string
  total_funding_raised?: number
  latest_funding_stage?: string
  last_funding_date?: string
  summary?: string
  website?: string
  gtm_motion?: string
  buyer_persona?: string
  customer_segment?: string
  estimated_ae_count?: number
  estimated_acv_range?: string
  estimated_customer_count?: string
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

async function fetchWebsiteText(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BYSTBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    // Strip scripts, styles, and HTML tags
    const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, '')
    const noTags = noStyles.replace(/<[^>]+>/g, ' ')
    const clean = noTags.replace(/\s+/g, ' ').trim()
    return clean.slice(0, 3000)
  } catch {
    return ''
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
  total_funding_raised: pdlData.total_funding_raised,
  latest_funding_stage: pdlData.latest_funding_stage,
  last_funding_date: pdlData.last_funding_date,
  summary: pdlData.summary,
}, null, 2)}`
    : 'No structured company data available.'

  const userMessage = `${companyContext}

Website content:
${websiteText || 'No website content available.'}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: `You are a B2B sales analyst. Based on the company data and website content provided, infer the following and return ONLY a valid JSON object with no preamble or markdown:
{
  "gtm_motion": "PLG | SLG | Hybrid",
  "buyer_persona": "e.g. marketing teams, sales leaders, finance teams",
  "customer_segment": "SMB | Mid-Market | Enterprise | Mixed",
  "estimated_ae_count": number,
  "estimated_acv_range": "e.g. $5K–$20K",
  "estimated_customer_count": "e.g. 500–2000"
}
Base your inference on: pricing page structure, free trial presence, sales CTAs, case studies, messaging tone, and employee count.`,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    return JSON.parse(text) as ClaudeInference
  } catch {
    // Try to extract JSON from the response
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as ClaudeInference } catch { /* ignore */ }
    }
    return {}
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

    // Step 2: Website
    const websiteText = await fetchWebsiteText(domain)

    // Step 3: Claude inference
    const inference = await callClaude(pdlData, websiteText)

    // Step 4: Merge into profile
    const profile: EnrichmentProfile = {
      domain,
      display_name: pdlData?.display_name,
      size: pdlData?.size,
      employee_count: pdlData?.employee_count,
      industry: pdlData?.industry,
      location: pdlData?.location?.name,
      total_funding_raised: pdlData?.total_funding_raised,
      latest_funding_stage: pdlData?.latest_funding_stage,
      last_funding_date: pdlData?.last_funding_date,
      summary: pdlData?.summary,
      website: pdlData?.website ?? domain,
      ...inference,
    }

    return NextResponse.json(profile)
  } catch (err) {
    console.error('Enrichment error:', err)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
