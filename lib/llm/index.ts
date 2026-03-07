import { LLM_PROVIDER } from './config'
import { AnthropicLLMClient } from './AnthropicLLMClient'
import { OpenAILLMClient } from './OpenAILLMClient'
import type { LLMClient } from './types'

/**
 * Returns the active LLM client based on LLM_PROVIDER env var.
 * Defaults to Anthropic. Set LLM_PROVIDER=openai to use OpenAI.
 */
export function getLLMClient(): LLMClient {
  if (LLM_PROVIDER === 'openai') return new OpenAILLMClient()
  return new AnthropicLLMClient()
}

export type { LLMClient, LLMCallInput, LLMCallOutput, LLMUsage } from './types'
export { LLM_PROVIDER, OPENAI_PROMPT_IDS, OPENAI_MODEL } from './config'
