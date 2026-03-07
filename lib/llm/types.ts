/**
 * Shared types for the LLM client abstraction.
 */

export interface LLMCallInput {
  /**
   * Anthropic mode: sent as the `system` parameter inline.
   * OpenAI mode: ignored — the system prompt is stored on the OpenAI platform.
   */
  systemPrompt?: string

  /**
   * OpenAI mode: references a stored prompt by ID (Prompt Management).
   * Anthropic mode: ignored.
   */
  promptId?: string

  /**
   * OpenAI mode: template variable values to fill `{{variable}}` placeholders
   * defined in the stored prompt. When provided, `userMessage` can be empty.
   * Anthropic mode: ignored (context is embedded in userMessage directly).
   */
  variables?: Record<string, string>

  /** The user turn message content. For Anthropic this carries all context;
   *  for OpenAI it may be empty when variables handle all context. */
  userMessage: string

  /** Max tokens for the response. Defaults vary per client. */
  maxTokens?: number
}

export interface LLMUsage {
  input_tokens: number
  output_tokens: number
}

export interface LLMCallOutput {
  /** Raw text response from the model. */
  text: string
  /** Token usage for logging/monitoring. May be undefined if not available. */
  usage?: LLMUsage
}

export interface LLMClient {
  complete(input: LLMCallInput): Promise<LLMCallOutput>
}
