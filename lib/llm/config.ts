/**
 * LLM provider configuration.
 *
 * Set LLM_PROVIDER=openai to route all LLM calls through OpenAI.
 * Defaults to 'anthropic'.
 *
 * When using OpenAI, system prompts are stored on the OpenAI platform (Prompt Management).
 * Supply the corresponding prompt ID for each call site via env vars below.
 *
 * To use a specific version of an OpenAI stored prompt, include the version directly
 * in the prompt ID env var. For example:
 *   OPENAI_ENRICH_PROMPT_ID=pmpt_abc123_v2
 * Each prompt version typically gets its own distinct ID on the OpenAI platform.
 */
export const LLM_PROVIDER: 'anthropic' | 'openai' =
  process.env.LLM_PROVIDER === 'openai' ? 'openai' : 'anthropic'

/**
 * Stored prompt IDs for each LLM call site (OpenAI Prompt Management).
 * Only required when LLM_PROVIDER=openai.
 */
export const OPENAI_PROMPT_IDS = {
  /** /api/enrich — company enrichment + opening message */
  enrich:    process.env.OPENAI_ENRICH_PROMPT_ID       ?? '',
  /** Single-LLM benchmark turn: scoring + acknowledgment + next question */
  singleLlm: process.env.OPENAI_SINGLE_LLM_PROMPT_ID   ?? '',
  /** Multi-LLM benchmark turn: scoring only */
  multiLlm:  process.env.OPENAI_MULTI_LLM_PROMPT_ID    ?? '',
  /** /api/score — standalone scoring route */
  score:     process.env.OPENAI_SCORE_PROMPT_ID         ?? '',
}
