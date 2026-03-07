/**
 * Client-safe stage transition messages.
 * Used in multi-LLM mode to inject a contextual message when moving between pillars.
 */

const TRANSITIONS: Record<string, string> = {
  '1→2':
    "Got it — that gives me a clear picture of how your AEs are set up day-to-day.\n\n**Let's shift to your leadership and coaching systems.** I want to understand how you spot performance issues and how feedback flows to your reps.",
  '2→3':
    "Helpful — I can see how your leadership systems are working.\n\n**One last area to cover: enablement.** I want to understand how your reps are equipped with playbooks, battlecards, and the tools they need to win deals.",
}

/**
 * Returns a stage transition message if moving between pillars, or null if no transition.
 */
export function getStageTransition(fromPillar: number | undefined, toPillar: number | undefined): string | null {
  if (!fromPillar || !toPillar || fromPillar === toPillar) return null
  return TRANSITIONS[`${fromPillar}→${toPillar}`] ?? null
}
