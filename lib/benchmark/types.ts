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
   * OpenAI Conversations API: response ID from the previous benchmark turn.
   * When set, OpenAI maintains conversation history server-side and we skip
   * re-sending historytext in template variables.
   */
  previousResponseId?: string
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
   * OpenAI Conversations API: response ID for this turn.
   * Pass as `previousResponseId` on the next benchmark turn to chain the conversation.
   */
  responseId?: string
}

export interface BenchmarkConversationService {
  processAnswer(input: BenchmarkTurnInput): Promise<BenchmarkTurnOutput>
}
