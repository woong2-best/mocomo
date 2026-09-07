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
