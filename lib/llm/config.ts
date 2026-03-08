/**
 * LLM provider configuration.
 *
 * Set LLM_PROVIDER=openai to route all LLM calls through OpenAI.
 * Defaults to 'anthropic'.
 *
 * When using OpenAI, system prompts are stored on the OpenAI platform (Prompt Management).
 * Supply the corresponding prompt ID for each call site via env vars below.
 */
export const LLM_PROVIDER: 'anthropic' | 'openai' =
  process.env.LLM_PROVIDER === 'openai' ? 'openai' : 'anthropic'

/**
 * Optional prompt version suffix applied to all OpenAI stored prompt IDs.
 *
 * OpenAI supports versioning via `<promptId>:<version>` syntax.
 * When OPENAI_PROMPT_VERSION is set, it is appended to every prompt ID.
 *
 * Examples:
 *   OPENAI_PROMPT_VERSION=2        → pmpt_xxx:2
 *   OPENAI_PROMPT_VERSION=latest   → pmpt_xxx:latest  (same as omitting the version)
 *   (unset)                        → pmpt_xxx          (OpenAI defaults to latest)
 */
const OPENAI_PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION ?? ''

function withVersion(id: string): string {
  if (!id || !OPENAI_PROMPT_VERSION) return id
  return `${id}:${OPENAI_PROMPT_VERSION}`
}

/**
 * Stored prompt IDs for each LLM call site (OpenAI Prompt Management).
 * Only required when LLM_PROVIDER=openai.
 * Version suffix is applied automatically via OPENAI_PROMPT_VERSION.
 */
export const OPENAI_PROMPT_IDS = {
  /** /api/enrich — company enrichment + opening message */
  enrich:    withVersion(process.env.OPENAI_ENRICH_PROMPT_ID       ?? ''),
  /** Single-LLM benchmark turn: scoring + acknowledgment + next question */
  singleLlm: withVersion(process.env.OPENAI_SINGLE_LLM_PROMPT_ID   ?? ''),
  /** Multi-LLM benchmark turn: scoring only */
  multiLlm:  withVersion(process.env.OPENAI_MULTI_LLM_PROMPT_ID    ?? ''),
  /** /api/score — standalone scoring route */
  score:     withVersion(process.env.OPENAI_SCORE_PROMPT_ID         ?? ''),
}
