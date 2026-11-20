/** Votes relative to age, like Reddit's "hot": a new arzi starts near the top and stays there only if people vote. */
export type Rankable = { id: string; created_at: string; approve_count: number; reject_count: number };

export function trendScore(r: Rankable, now = Date.now()): number {
  const hours = Math.max(0, (now - Date.parse(r.created_at)) / 3_600_000);
  return (r.approve_count + r.reject_count + 1) / Math.pow(hours + 2, 1.5);
}

/** Highest score first; anything without a score keeps its place after the scored ones. */
export function byScore<T extends { id: string }>(items: T[], score: Map<string, number>): T[] {
  return [...items].sort((a, b) => (score.get(b.id) ?? -1) - (score.get(a.id) ?? -1));
}
