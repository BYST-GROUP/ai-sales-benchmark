export interface ConversationTurn {
  questionId: string
  answer: string
}

export interface BenchmarkTurnInput {
  currentQuestionId: string
  answer: string
  remainingQuestions: string[]
  sessionId?: string
  companyContext?: string
  conversationHistory?: ConversationTurn[]
  currentScores?: Record<string, number>
}

export interface BenchmarkTurnOutput {
  scores: Record<string, number>
  /** Single-LLM only: AI-generated response including acknowledgment, transition, and next question */
  message?: string
  /** Single-LLM only: answer options for the next question */
  options?: string[]
  /** Single-LLM only: the next question ID to show */
  nextQuestionId?: string
}

export interface BenchmarkConversationService {
  processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput>
}
