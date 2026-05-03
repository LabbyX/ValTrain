export type MatchOutcome = 'win' | 'loss' | 'draw'

/** Оба значения заданы — сравниваем слева направо «мы : они». */
export function matchOutcome(
  left?: number | null,
  right?: number | null,
): MatchOutcome | null {
  if (left == null || right == null) return null
  if (left > right) return 'win'
  if (left < right) return 'loss'
  return 'draw'
}

export function scoreOutcomeClass(o: MatchOutcome | null): string {
  if (o === 'win') return 'vt-score-cell vt-score-cell--win'
  if (o === 'loss') return 'vt-score-cell vt-score-cell--loss'
  if (o === 'draw') return 'vt-score-cell vt-score-cell--draw'
  return 'vt-score-cell vt-score-cell--empty'
}
