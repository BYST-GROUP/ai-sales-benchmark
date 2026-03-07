import Anthropic from '@anthropic-ai/sdk'
import type { LLMCallInput, LLMCallOutput, LLMClient } from './types'

export class AnthropicLLMClient implements LLMClient {
  async complete({ systemPrompt, userMessage, maxTokens = 1024 }: LLMCallInput): Promise<LLMCallOutput> {
    // Instantiated at call-time so ANTHROPIC_API_KEY is guaranteed to be loaded
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return {
      text,
      usage: response.usage
        ? { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
        : undefined,
    }
  }
}
