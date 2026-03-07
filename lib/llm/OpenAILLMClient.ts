import OpenAI from 'openai'
import { OPENAI_MODEL } from './config'
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

    // System prompt is stored on the OpenAI platform (Prompt Management).
    // We reference it by ID — no system prompt is sent in the request body.
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      prompt: { id: promptId },
      input: userMessage,
      max_output_tokens: maxTokens,
    })

    return {
      text: response.output_text,
      usage: response.usage
        ? { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
        : undefined,
    }
  }
}
