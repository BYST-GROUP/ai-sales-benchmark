import Anthropic from '@anthropic-ai/sdk'
import { BenchmarkConversationService, BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'
import { SINGLE_LLM_SYSTEM_PROMPT, buildSingleLlmUserMessage } from '@/lib/benchmark/prompts/singleLlmPrompt'
import { appendLog } from '@/lib/logger'
import { QUESTION_MAP } from '@/lib/questions'

interface SingleLlmResponse {
  scores: Record<string, number>
  acknowledgment: string
  stage_transition: string | null
  next_question: string | null
  next_question_id: string | null
  options: string[] | null
}

export class SingleLlmBenchmarkConversationService implements BenchmarkConversationService {
  async processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput> {
    const { currentQuestionId, sessionId, answer } = input

    // Instantiate at request-time so env vars are guaranteed to be loaded
    const anthropic = new Anthropic()

    const userMessage = buildSingleLlmUserMessage(input)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SINGLE_LLM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: SingleLlmResponse | null = null
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch { /* ignore */ }
      }
    }

    const scores: Record<string, number> = parsed?.scores ?? {}

    // Always ensure the current question gets a score
    if (!scores[currentQuestionId]) {
      scores[currentQuestionId] = 2
    }

    // Build the display message: acknowledgment + optional transition + next question
    const parts: string[] = []
    if (parsed?.acknowledgment) parts.push(parsed.acknowledgment)
    if (parsed?.stage_transition) parts.push(parsed.stage_transition)
    if (parsed?.next_question) parts.push(parsed.next_question)
    const displayMessage = parts.join('\n\n') || undefined

    const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

    await appendLog({
      event: 'benchmark_answer',
      mode: 'single',
      sessionId: sessionId ?? null,
      questionId: currentQuestionId,
      question: currentQuestionText,
      answer,
      scores,
      next_question_id: parsed?.next_question_id ?? null,
      token_usage: message.usage,
    })

    return {
      scores,
      message: displayMessage,
      options: parsed?.options ?? undefined,
      nextQuestionId: parsed?.next_question_id ?? undefined,
    }
  }
}
