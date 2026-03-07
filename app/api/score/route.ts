import { NextRequest, NextResponse } from 'next/server'
import { QUESTION_MAP } from '@/lib/questions'
import { appendLog } from '@/lib/logger'
import { SCORING_SYSTEM_PROMPT, buildScoringUserMessage } from '@/lib/benchmark/prompts/multiLlmPrompts'
import { getLLMClient, OPENAI_PROMPT_IDS } from '@/lib/llm'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { currentQuestionId, answer, remainingQuestions, sessionId } = body as {
      currentQuestionId: string
      answer: string
      remainingQuestions: string[]
      sessionId?: string
    }

    if (!currentQuestionId || !answer) {
      return NextResponse.json({ error: 'currentQuestionId and answer are required' }, { status: 400 })
    }

    const userMessage = buildScoringUserMessage(currentQuestionId, answer, remainingQuestions ?? [])

    const { text, usage } = await getLLMClient().complete({
      systemPrompt: SCORING_SYSTEM_PROMPT,
      promptId: OPENAI_PROMPT_IDS.score,
      userMessage,
      maxTokens: 256,
    })

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

    const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

    await appendLog({
      event: 'benchmark_answer',
      sessionId: sessionId ?? null,
      questionId: currentQuestionId,
      question: currentQuestionText,
      answer,
      scores,
      token_usage: usage ?? null,
    })

    return NextResponse.json({ scores })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[score] error:', err)
    return NextResponse.json({ error: 'Scoring failed', _debug: detail }, { status: 503 })
  }
}
