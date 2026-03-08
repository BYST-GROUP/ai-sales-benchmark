import { BenchmarkConversationService, BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'
import {
  SINGLE_LLM_SYSTEM_PROMPT,
  buildSingleLlmUserMessage,
  buildSingleLlmVariables,
  buildStartUserMessage,
  buildStartVariables,
} from '@/lib/benchmark/prompts/singleLlmPrompt'
import { appendLog } from '@/lib/logger'
import { QUESTION_MAP } from '@/lib/questions'
import { getLLMClient, OPENAI_PROMPT_IDS } from '@/lib/llm'

interface SingleLlmResponse {
  scores: Record<string, number>
  acknowledgment: string | null
  stage_transition: string | null
  insight: string | null
  next_question: string | null
  next_question_id: string | null
  options: string[] | null
}

export class SingleLlmBenchmarkConversationService implements BenchmarkConversationService {
  async processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput> {
    const { currentQuestionId, sessionId, answer, previousResponseId } = input

    // 'START' is a special sentinel used when the user has just confirmed/corrected
    // the enrichment message and we need the LLM to open the benchmark with Q1.
    const isStart = currentQuestionId === 'START'

    // Anthropic: full context embedded in userMessage text
    // OpenAI: context passed as template variables to fill {{placeholder}} slots
    //
    // When previousResponseId is set (OpenAI Conversations API), conversation history
    // is maintained server-side by OpenAI — we pass an empty historytext to avoid
    // duplicating history that's already in the chained response context.
    const userMessage = isStart
      ? buildStartUserMessage(input)
      : buildSingleLlmUserMessage(input)

    const baseVariables = isStart
      ? buildStartVariables(input)
      : buildSingleLlmVariables(input)

    // For START, there's no previous response to chain from.
    // For regular turns, suppress historytext when OpenAI manages history server-side.
    const variables = (!isStart && previousResponseId)
      ? { ...baseVariables, historytext: '' }
      : baseVariables

    const { text, usage, responseId } = await getLLMClient().complete({
      systemPrompt: SINGLE_LLM_SYSTEM_PROMPT,
      promptId: OPENAI_PROMPT_IDS.singleLlm,
      userMessage,
      variables,
      maxTokens: 2048, // reasoning models need headroom for thinking + JSON output
      previousResponseId: isStart ? undefined : previousResponseId,
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

    // Always ensure the current question gets a score — but not for START
    // (there's no real question to score on the first turn).
    if (!isStart && !scores[currentQuestionId]) {
      scores[currentQuestionId] = 2
    }

    // Build the display message: acknowledgment → transition → insight → next question
    // For START turns, skip the acknowledgment since the intro message is already shown.
    const parts: string[] = []
    if (!isStart && parsed?.acknowledgment) parts.push(parsed.acknowledgment)
    if (parsed?.stage_transition) parts.push(parsed.stage_transition)
    if (parsed?.insight) parts.push(parsed.insight)
    if (parsed?.next_question) parts.push(parsed.next_question)
    const displayMessage = parts.join('\n\n') || undefined

    const currentQuestionText = isStart
      ? 'Benchmark start'
      : (QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId)

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
      responseId,
    }
  }
}
