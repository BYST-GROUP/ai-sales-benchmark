import OpenAI from 'openai'
import type { LLMCallInput, LLMCallOutput, LLMClient } from './types'

/**
 * Strips markdown code fences that OpenAI models sometimes wrap JSON in.
 * e.g. ```json\n{...}\n``` → {...}
 */
function stripMarkdownCodeFence(text: string): string {
  return text
    .replace(/^```(?:json|JSON)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

export class OpenAILLMClient implements LLMClient {
  async complete({ promptId, userMessage, variables, maxTokens = 1024 }: LLMCallInput): Promise<LLMCallOutput> {
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
    // When variables are provided they fill {{placeholder}} slots in the stored prompt template.
    const response = await openai.responses.create({
      prompt: {
        id: promptId,
        ...(variables ? { variables } : {}),
      },
      input: userMessage,
      max_output_tokens: maxTokens,
    } as Parameters<typeof openai.responses.create>[0])

    // output_text is the convenience accessor for message-type output items.
    // Fall back to scanning output array for text content if output_text is empty.
    let rawText: string = response.output_text ?? ''

    if (!rawText) {
      for (const item of response.output ?? []) {
        if (item.type === 'message') {
          for (const part of (item as { type: string; content: { type: string; text: string }[] }).content ?? []) {
            if (part.type === 'output_text' && part.text) {
              rawText += part.text
            }
          }
        }
      }
    }

    console.log('[OpenAILLMClient] raw response text:', rawText.slice(0, 300))

    const text = stripMarkdownCodeFence(rawText)

    return {
      text,
      usage: response.usage
        ? { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
        : undefined,
    }
  }
}
