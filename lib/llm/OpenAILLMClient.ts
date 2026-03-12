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

// Lazily initialised so OPENAI_API_KEY is only required when the OpenAI provider is active.
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

/**
 * Pre-creates an OpenAI Conversations API thread.
 * Call once during enrichment so the first benchmark turn skips the extra round-trip.
 */
export async function createOpenAIConversation(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = await ((getOpenAI() as any).conversations.create() as Promise<{ id: string }>)
  return conversation.id
}

/**
 * Returns true when the OpenAI error is the "orphaned reasoning item" error.
 * This happens when a prior call timed out after the model emitted a reasoning
 * token but before it emitted the final message — leaving the server-side
 * conversation in a broken state.
 */
function isOrphanedReasoningError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes("of type 'reasoning' was provided without its required following item")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callResponsesAPI(openai: OpenAI, params: Record<string, unknown>): Promise<any> {
  return (openai.responses.create as (p: Record<string, unknown>) => Promise<unknown>)(params)
}

export class OpenAILLMClient implements LLMClient {
  async complete({ promptId, userMessage, variables, maxTokens = 1024, conversationId }: LLMCallInput): Promise<LLMCallOutput> {
    if (!promptId) {
      throw new Error(
        '[OpenAILLMClient] No promptId provided. Set the corresponding OPENAI_*_PROMPT_ID env var.',
      )
    }

    const openai = getOpenAI()

    // Conversations API approach: one persistent conv_... object per benchmark session.
    // Normally the ID is pre-created during enrichment; this fallback handles edge cases.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let convId = conversationId
    if (!convId) {
      convId = await createOpenAIConversation()
      console.log('[OpenAILLMClient] Created new conversation (fallback):', convId)
    }

    // The model and its configuration (including reasoning settings) are defined
    // in the stored prompt on the OpenAI platform — we do not specify a model here
    // so the prompt's own configuration takes precedence and no parameter conflicts occur.
    //
    // `input`     = the rendered template string (company context + question + answer + instructions).
    // `variables` = fills any {{placeholder}} slots in the stored prompt template.
    // `conversation` = the persistent conv_... ID that carries the full conversation history.
    const params = {
      prompt: {
        id: promptId,
        ...(variables ? { variables } : {}),
      },
      input: userMessage,
      max_output_tokens: maxTokens,
      store: true,
      conversation: convId,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any
    try {
      response = await callResponsesAPI(openai, params)
    } catch (err) {
      // Orphaned reasoning item: a prior call timed out after the model emitted a
      // reasoning token but before it emitted the final message, leaving the
      // server-side conversation in a broken state.
      // Recovery: discard the broken conversation, start a fresh one, retry once.
      if (isOrphanedReasoningError(err)) {
        console.warn('[OpenAILLMClient] Orphaned reasoning item detected — resetting conversation and retrying.')
        convId = await createOpenAIConversation()
        response = await callResponsesAPI(openai, { ...params, conversation: convId })
      } else {
        throw err
      }
    }

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

    // convId is the stable Conversations API ID (conv_...) — the same value is returned on
    // every turn so the caller can store it once and reuse it for the entire session.
    console.log('[OpenAILLMClient] raw response text:', rawText.slice(0, 300))
    console.log('[OpenAILLMClient] conversation id (stable):', convId)

    const text = stripMarkdownCodeFence(rawText)

    return {
      text,
      usage: response.usage
        ? { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
        : undefined,
      conversationId: convId,
    }
  }
}
