import { BenchmarkConversationService, BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'
import { SCORING_SYSTEM_PROMPT, buildScoringUserMessage } from '@/lib/benchmark/prompts/multiLlmPrompts'
import { appendLog } from '@/lib/logger'
import { QUESTION_MAP } from '@/lib/questions'
import { getLLMClient, OPENAI_PROMPT_IDS } from '@/lib/llm'

export class MultiLlmBenchmarkConversationService implements BenchmarkConversationService {
  async processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput> {
    const { currentQuestionId, answer, remainingQuestions, sessionId } = input

    const userMessage = buildScoringUserMessage(currentQuestionId, answer, remainingQuestions)

    const { text, usage } = await getLLMClient().complete({
      systemPrompt: SCORING_SYSTEM_PROMPT,
      promptId: OPENAI_PROMPT_IDS.multiLlm,
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
      mode: 'multi',
      sessionId: sessionId ?? null,
      questionId: currentQuestionId,
      question: currentQuestionText,
      answer,
      scores,
      token_usage: usage ?? null,
    })

    return { scores }
  }
}
