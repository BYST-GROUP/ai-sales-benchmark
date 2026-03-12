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
  options: string[] | null
}

export class SingleLlmBenchmarkConversationService implements BenchmarkConversationService {
  async processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput> {
    const { currentQuestionId, sessionId, answer, conversationId } = input

    const isStart = currentQuestionId === 'START'

    // App-side: compute next question and completion BEFORE calling the LLM.
    // The LLM is told which question to ask next — it no longer tracks question ordering.
    const remainingAfterThis = input.remainingQuestions.filter(id => id !== currentQuestionId)
    const nextQuestionId     = remainingAfterThis[0] ?? null
    const isComplete         = nextQuestionId === null && !isStart
    const nextQuestionText   = nextQuestionId ? (QUESTION_MAP[nextQuestionId]?.text ?? nextQuestionId) : null

    // Three modes for building the per-turn payload:
    //
    // 1. START turn: first call, includes full company context in the conversation history.
    // 2. Non-START with conversationId (OpenAI Conversations API): history lives server-side.
    // 3. Non-START without conversationId (Anthropic fallback): full context embedded in message.
    let userMessage: string
    let variables: Record<string, string>

    if (isStart) {
      variables   = {
        ...buildStartVariables(input),
        // Stored prompt requires {{nextquestionid}} on every turn — Q1 is always next at START.
        nextquestionid: nextQuestionId ?? '',
      }
      userMessage = buildOpenAIInputMessage({
        companycontext:   variables.companycontext,
        answer:           variables.answer,
        nextquestiontext: nextQuestionText ?? '',
      })
    } else if (conversationId) {
      // Conversations API thread established — history (including company context) lives server-side.
      const currentquestiontext = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

      userMessage = buildOpenAIFollowUpMessage({
        answer,
        nextquestionid:   nextQuestionId,
        nextquestiontext: nextQuestionText,
        isComplete,
      })
      variables   = {
        currentquestionid:   currentQuestionId,
        currentquestiontext,
        answer,
        companycontext:      '', // already in conversation history
        nextquestionid:      nextQuestionId ?? '',
        // nextquestiontext is passed via the input message only — not as a stored-prompt variable
        // to avoid 400 errors if the stored prompt doesn't declare {{nextquestiontext}}.
      }
    } else {
      // Anthropic / no-thread fallback — embed full context in message.
      userMessage = buildSingleLlmUserMessage(input, { nextQuestionText, isComplete })
      variables   = buildSingleLlmVariables(input)
    }

    const { text, usage, conversationId: returnedConversationId } = await getLLMClient().complete({
      systemPrompt: SINGLE_LLM_SYSTEM_PROMPT,
      promptId: OPENAI_PROMPT_IDS.singleLlm,
      userMessage,
      variables,
      maxTokens: 8192, // reasoning models consume tokens for thinking; 2048 was exhausted before output
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

    // Always ensure the current question gets a score — but not for START.
    if (!isStart && !scores[currentQuestionId]) {
      scores[currentQuestionId] = 2
    }

    // Re-compute nextQuestionId and isComplete AFTER seeing the LLM scores.
    // The LLM may pre-score future questions from a comprehensive answer — if it
    // does, those questions must be skipped so they aren't asked again.
    const scoredIds = new Set(Object.keys(scores))
    const actualNextQuestionId = remainingAfterThis.find(id => !scoredIds.has(id)) ?? null
    const actualIsComplete     = actualNextQuestionId === null && !isStart

    const displayMessage    = parsed?.message ?? undefined
    const currentQuestionText = isStart ? 'Benchmark start' : (QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId)
    // Options come from the LLM (it knows the answer options from its system prompt).
    const options           = parsed?.options ?? null

    await appendLog({
      event: 'benchmark_answer',
      mode: 'single',
      sessionId: sessionId ?? null,
      questionId: currentQuestionId,
      question: currentQuestionText,
      answer,
      scores,
      next_question_id: actualNextQuestionId,
      is_complete: actualIsComplete,
      token_usage: usage ?? null,
    })

    return {
      scores,
      message: displayMessage,
      options: options ?? undefined,
      nextQuestionId: actualNextQuestionId ?? undefined,
      isComplete: actualIsComplete,
      conversationId: returnedConversationId,
    }
  }
}
