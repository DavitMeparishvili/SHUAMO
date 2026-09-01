export const DEDUP_WINDOW_MS = 30 * 60 * 1000;

export function decideCreditability(input: {
  priorClickAt: Date | undefined;
  now: Date;
}): boolean {
  return (
    input.priorClickAt === undefined ||
    input.now.getTime() - input.priorClickAt.getTime() >= DEDUP_WINDOW_MS
  );
}
