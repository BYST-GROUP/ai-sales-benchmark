/**
 * Client-safe feature flags for the results UI.
 *
 * Defaults are defined here. Override via NEXT_PUBLIC_ env vars in .env.local:
 *   NEXT_PUBLIC_SHOW_PILLAR_SCORES=true
 */

export const FEATURE_FLAGS = {
  /** Show per-pillar score breakdown cards on the results page. */
  SHOW_PILLAR_SCORES: process.env.NEXT_PUBLIC_SHOW_PILLAR_SCORES === 'true',
} as const
