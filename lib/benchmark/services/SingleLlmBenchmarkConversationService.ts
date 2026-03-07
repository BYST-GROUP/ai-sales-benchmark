import { BenchmarkConversationService, BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'
import { SINGLE_LLM_SYSTEM_PROMPT, buildSingleLlmUserMessage } from '@/lib/benchmark/prompts/singleLlmPrompt'
import { appendLog } from '@/lib/logger'
import { QUESTION_MAP } from '@/lib/questions'
import { getLLMClient, OPENAI_PROMPT_IDS } from '@/lib/llm'

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

    const userMessage = buildSingleLlmUserMessage(input)

    const { text, usage } = await getLLMClient().complete({
      systemPrompt: SINGLE_LLM_SYSTEM_PROMPT,
      promptId: OPENAI_PROMPT_IDS.singleLlm,
      userMessage,
      maxTokens: 512,
    })

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
      token_usage: usage ?? null,
    })

    return {
      scores,
      message: displayMessage,
      options: parsed?.options ?? undefined,
      nextQuestionId: parsed?.next_question_id ?? undefined,
    }
  }
}
