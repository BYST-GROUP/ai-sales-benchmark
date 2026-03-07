import Anthropic from '@anthropic-ai/sdk'
import { BenchmarkConversationService, BenchmarkTurnInput, BenchmarkTurnOutput } from '@/lib/benchmark/types'
import { SCORING_SYSTEM_PROMPT, buildScoringUserMessage } from '@/lib/benchmark/prompts/multiLlmPrompts'
import { appendLog } from '@/lib/logger'
import { QUESTION_MAP } from '@/lib/questions'

export class MultiLlmBenchmarkConversationService implements BenchmarkConversationService {
  async processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput> {
    const { currentQuestionId, answer, remainingQuestions, sessionId } = input

    // Instantiate at request-time so env vars are guaranteed to be loaded
    const anthropic = new Anthropic()

    const userMessage = buildScoringUserMessage(currentQuestionId, answer, remainingQuestions)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
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

    const currentQuestionText = QUESTION_MAP[currentQuestionId]?.text ?? currentQuestionId

    await appendLog({
      event: 'benchmark_answer',
      mode: 'multi',
      sessionId: sessionId ?? null,
      questionId: currentQuestionId,
      question: currentQuestionText,
      answer,
      scores,
      token_usage: message.usage,
    })

    return { scores }
  }
}
