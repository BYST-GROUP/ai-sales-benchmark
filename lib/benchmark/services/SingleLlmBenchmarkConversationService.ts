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
      variables   = buildStartVariables(input)
      userMessage = buildOpenAIInputMessage({
        companycontext:   variables.companycontext,
        answer:           variables.answer,
        nextquestiontext: nextQuestionText ?? '',
      })
    } else if (conversationId) {
      // Conversations API thread established — history (including company context) lives server-side.
      const currentquestiontext = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

      userMessage = buildOpenAIFollowUpMessage({
        currentquestiontext,
        answer,
        nextquestiontext: nextQuestionText,
        isComplete,
      })
      variables   = {
        currentquestionid:   currentQuestionId,
        currentquestiontext,
        answer,
        companycontext:      '', // already in conversation history
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

    // Only keep the score for the question being answered in this turn (not START).
    // The LLM sometimes pre-scores future questions from a comprehensive answer, but
    // question ordering is app-controlled — allowing pre-scores causes nextQuestionId
    // to point to an already-scored question, making it get asked a second time.
    let scores: Record<string, number> = parsed?.scores ?? {}
    if (!isStart) {
      scores = { [currentQuestionId]: scores[currentQuestionId] ?? 2 }
    }

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
      next_question_id: nextQuestionId,
      is_complete: isComplete,
      token_usage: usage ?? null,
    })

    return {
      scores,
      message: displayMessage,
      options: options ?? undefined,
      nextQuestionId: nextQuestionId ?? undefined,
      isComplete,
      conversationId: returnedConversationId,
    }
  }
}
