import { NextRequest, NextResponse } from 'next/server'
import { getLLMClient, OPENAI_PROMPT_IDS, LLM_PROVIDER } from '@/lib/llm'
import { AnthropicLLMClient } from '@/lib/llm/AnthropicLLMClient'
import { appendLog } from '@/lib/logger'
import {
  REPORT_SYSTEM_PROMPT,
  buildReportUserMessage,
  buildReportVariables,
  type ReportConversationEntry,
} from '@/lib/benchmark/prompts/reportPrompt'
import type { BenchmarkReport } from '@/lib/benchmark-state'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, companyContext, conversation } = body as {
      sessionId?: string
      companyContext?: string
      conversation: ReportConversationEntry[]
    }

    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'conversation is required' }, { status: 400 })
    }

    const userMessage = buildReportUserMessage(companyContext, conversation)
    const variables   = buildReportVariables(companyContext, conversation)

    // Use OpenAI stored prompt if configured; otherwise fall back to Anthropic
    // with the inline REPORT_SYSTEM_PROMPT (no stored prompt required)
    const hasOpenAIPrompt = LLM_PROVIDER === 'openai' && !!OPENAI_PROMPT_IDS.scoreReport
    const client = hasOpenAIPrompt ? getLLMClient() : new AnthropicLLMClient()

    const { text, usage } = await client.complete({
      systemPrompt: REPORT_SYSTEM_PROMPT,
      promptId:     hasOpenAIPrompt ? OPENAI_PROMPT_IDS.scoreReport : undefined,
      variables:    hasOpenAIPrompt ? variables : undefined,
      userMessage,
      maxTokens:    4096, // report has multiple long text fields — 1024 was too small and truncated JSON
    })

    // Parse the LLM JSON response
    let report: BenchmarkReport | null = null
    try {
      report = JSON.parse(text)
    } catch {
      // Try to extract JSON from surrounding text
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try { report = JSON.parse(match[0]) } catch { /* ignore */ }
      }
    }

    if (!report) {
      console.error('[score-report] failed to parse LLM response:', text)
      return NextResponse.json({
        error: 'Failed to parse report from LLM',
        _raw: text.slice(0, 2000), // truncated for safety
      }, { status: 502 })
    }

    await appendLog({
      event:       'benchmark_report',
      sessionId:   sessionId ?? null,
      report,
      token_usage: usage ?? null,
    })

    return NextResponse.json({ report })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[score-report] error:', err)
    return NextResponse.json({ error: 'Report generation failed', _debug: detail }, { status: 503 })
  }
}
