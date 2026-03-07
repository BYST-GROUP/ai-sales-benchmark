import OpenAI from 'openai'
import type { LLMCallInput, LLMCallOutput, LLMClient } from './types'

export class OpenAILLMClient implements LLMClient {
  async complete({ promptId, userMessage, maxTokens = 1024 }: LLMCallInput): Promise<LLMCallOutput> {
    if (!promptId) {
      throw new Error(
        '[OpenAILLMClient] No promptId provided. Set the corresponding OPENAI_*_PROMPT_ID env var.',
      )
    }

    // Instantiated at call-time so OPENAI_API_KEY is guaranteed to be loaded
    const openai = new OpenAI()

    // The model and its configuration (including reasoning settings) are defined
    // in the stored prompt on the OpenAI platform — we do not specify a model here
    // so the prompt's own configuration takes precedence and no parameter conflicts occur.
    const response = await openai.responses.create({
      prompt: { id: promptId },
      input: userMessage,
      max_output_tokens: maxTokens,
    } as Parameters<typeof openai.responses.create>[0])

    return {
      text: response.output_text,
      usage: response.usage
        ? { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
        : undefined,
    }
  }
}
