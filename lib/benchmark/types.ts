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
  /**
   * OpenAI Conversations API: the conversation ID for this benchmark session.
   * Undefined on the first (START) turn so OpenAI creates a new conversation.
   * Set to the returned ID on all subsequent turns to continue the same thread.
   */
  conversationId?: string
}

export interface BenchmarkTurnOutput {
  scores: Record<string, number>
  /** Single-LLM only: full user-facing message (insight + transitions + next question combined) */
  message?: string
  /** Single-LLM only: answer options for the next question */
  options?: string[]
  /** Single-LLM only: the next question ID to show */
  nextQuestionId?: string
  /** Single-LLM only: true when the LLM signals the benchmark is complete */
  isComplete?: boolean
  /**
   * OpenAI Conversations API: the conversation ID for this session.
   * Returned on every turn — pass it as `conversationId` on the next benchmark turn.
   */
  conversationId?: string
}

export interface BenchmarkConversationService {
  processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput>
}
