/**
 * Server-side benchmark mode configuration.
 * Set BENCHMARK_LLM_MODE=multi to use a separate scoring-only LLM call per answer (legacy).
 * Defaults to 'single': one Claude call per turn drives scoring, acknowledgment, transitions, and next question.
 */
export const BENCHMARK_LLM_MODE: 'single' | 'multi' =
  (process.env.BENCHMARK_LLM_MODE as 'single' | 'multi') === 'multi' ? 'multi' : 'single'
