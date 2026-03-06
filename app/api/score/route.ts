import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { QUESTION_MAP } from '@/lib/questions'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { currentQuestionId, answer, remainingQuestions } = body as {
      currentQuestionId: string
      answer: string
      remainingQuestions: string[]
    }

    if (!currentQuestionId || !answer) {
      return NextResponse.json({ error: 'currentQuestionId and answer are required' }, { status: 400 })
    }

    const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

    const otherRemaining = (remainingQuestions ?? [])
      .filter(id => id !== currentQuestionId)
      .map(id => `${id}: ${QUESTION_MAP[id]?.text ?? id}`)
      .join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: `You are scoring a sales organisation's AI maturity benchmark based on the Skaled AI GTM Maturity Curve.

You have just received an answer to one of the benchmark questions. Your job is to:
1. Score the answered question on a scale of 1–5 based on the maturity stage it best matches
2. Check if any of the REMAINING unanswered questions were also answered in this response
3. If yes, score those questions too

The 5 maturity stages are:
- Stage 1 — The Wild West: Ad-hoc AI experiments, no governance or repeatability
- Stage 2 — Emerging Assistants: Team-level adoption, uneven usage, disconnected tools
- Stage 3 — Connected Workflows: AI integrated into CRM and core workflows, repeatable processes
- Stage 4 — Automated Insights: AI delivers proactive insights automatically, predictive GTM motion
- Stage 5 — AI-First GTM Platform: Fully automated end-to-end, unified AI platform, no manual input required

Return ONLY a JSON object in this exact format:
{
  "scores": {
    "Q1": 3,
    "Q3": 2
  }
}

Only include question IDs that were answered in this response.
Do not include any explanation or text outside the JSON object.`,
      messages: [
        {
          role: 'user',
          content: `The user was just asked: "${currentQuestionText}"

Their answer was: "${answer}"

The following questions have not yet been answered:
${otherRemaining || '(none)'}

Score the current question and identify if any remaining questions were also answered.`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let scores: Record<string, number> = {}
    try {
      scores = JSON.parse(text).scores ?? {}
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          scores = JSON.parse(match[0]).scores ?? {}
        } catch { /* ignore */ }
      }
    }

    // Always ensure the current question gets a score
    if (!scores[currentQuestionId]) {
      scores[currentQuestionId] = 2
    }

    console.log('[score] scored questions:', JSON.stringify(scores))

    return NextResponse.json({ scores })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[score] error:', err)
    return NextResponse.json({ error: 'Scoring failed', _debug: detail }, { status: 503 })
  }
}
