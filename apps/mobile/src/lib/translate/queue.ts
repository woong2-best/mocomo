/**
 * Caps how many full posts start at once.
 * Do not use this for UI strings — each string must reach `translateMlKit` in the
 * same turn so short lines can share one model load. That client also refuses
 * overlapping native calls for a single language pair.
 */
let active = 0;
const pending: Array<() => void> = [];
const MAX_CONCURRENT = 2;

function pump(): void {
  while (active < MAX_CONCURRENT && pending.length > 0) {
    active += 1;
    const run = pending.shift()!;
    run();
  }
}

export function enqueueTranslation<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pending.push(() => {
      void job()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    });
    pump();
  });
}
