import { BenchmarkConversationService, BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'
import {
  SINGLE_LLM_SYSTEM_PROMPT,
  buildOpenAIInputMessage,
  buildOpenAIFollowUpMessage,
  buildSingleLlmUserMessage,
  buildSingleLlmVariables,
  buildStartVariables,
} from '@/lib/benchmark/prompts/singleLlmPrompt'
import { appendLog } from '@/lib/logger'
import { QUESTION_MAP } from '@/lib/questions'
import { getLLMClient, OPENAI_PROMPT_IDS } from '@/lib/llm'

interface SingleLlmResponse {
  scores: Record<string, number>
  message: string | null
  next_question_id: string | null
  options: string[] | null
  is_complete: boolean
}

export class SingleLlmBenchmarkConversationService implements BenchmarkConversationService {
  async processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput> {
    const { currentQuestionId, sessionId, answer, conversationId } = input

    // 'START' is a special sentinel used when the user has just confirmed/corrected
    // the enrichment message and we need the LLM to open the benchmark with Q1.
    const isStart = currentQuestionId === 'START'

    // Three modes for building the per-turn payload:
    //
    // 1. START turn (isStart): first call — OpenAILLMClient will create a new conv_... here.
    //    `userMessage` = rendered template (same structure as all subsequent OpenAI turns).
    //    `variables`   = full START variable set (fills stored prompt {{placeholder}} slots).
    //
    // 2. Non-START with conversationId (OpenAI Conversations API): conv_... already established.
    //    `userMessage` = rendered template with current-turn values.
    //    `variables`   = minimal set for stored prompt slots (companycontext always included).
    //
    // 3. Non-START without conversationId (Anthropic fallback): embed all context in the message.
    let userMessage: string
    let variables: Record<string, string>

    if (isStart) {
      // Build variables first; reuse their values to render the input message consistently.
      variables   = buildStartVariables(input)
      userMessage = buildOpenAIInputMessage({
        companycontext:      variables.companycontext,
        currentquestiontext: variables.currentquestiontext, // 'N/A — benchmark has not started yet'
        answer:              variables.answer,
      })
    } else if (conversationId) {
      // Conversations API thread established — history (including company context) lives server-side.
      // Send only the current question + answer to minimise per-turn input tokens.
      const currentquestiontext = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId
      const answer              = input.answer

      userMessage = buildOpenAIFollowUpMessage({ currentquestiontext, answer })
      variables   = {
        currentquestionid:   currentQuestionId,
        currentquestiontext,
        answer,
        companycontext:      '', // already in conversation history
      }
    } else {
      // Anthropic / no-thread fallback — embed full context in message.
      userMessage = buildSingleLlmUserMessage(input)
      variables   = buildSingleLlmVariables(input)
    }

    const { text, usage, conversationId: returnedConversationId } = await getLLMClient().complete({
      systemPrompt: SINGLE_LLM_SYSTEM_PROMPT,
      promptId: OPENAI_PROMPT_IDS.singleLlm,
      userMessage,
      variables,
      maxTokens: 2048, // reasoning models need headroom for thinking + JSON output
      conversationId,
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

    const displayMessage = parsed?.message ?? undefined

    const currentQuestionText = isStart
      ? 'Benchmark start'
      : (QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId)

    const isComplete = parsed?.is_complete ?? false

    await appendLog({
      event: 'benchmark_answer',
      mode: 'single',
      sessionId: sessionId ?? null,
      questionId: currentQuestionId,
      question: currentQuestionText,
      answer,
      scores,
      next_question_id: parsed?.next_question_id ?? null,
      is_complete: isComplete,
      token_usage: usage ?? null,
    })

    return {
      scores,
      message: displayMessage,
      options: parsed?.options ?? undefined,
      nextQuestionId: parsed?.next_question_id ?? undefined,
      isComplete,
      conversationId: returnedConversationId,
    }
  }
}
