/** Puzzles fetched per batch when filling/refilling the scroll feed. */
export const FEED_BATCH_SIZE = 5;

/** Fetch another batch once this many unseen puzzles remain ahead of the user. */
export const FEED_PREFETCH_THRESHOLD = 3;

/** Whether the feed should fetch another batch given the current scroll position. */
export function shouldPrefetchMore(
  activeIndex: number,
  queueLength: number,
  threshold: number = FEED_PREFETCH_THRESHOLD,
): boolean {
  return queueLength - activeIndex <= threshold;
}

/** Appends `incoming` puzzles to `existing`, dropping any already-seen lichessId. */
export function dedupePuzzlesById<T extends { lichessId: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const seen = new Set(existing.map((p) => p.lichessId));
  const fresh = incoming.filter((p) => !seen.has(p.lichessId));
  return [...existing, ...fresh];
}
