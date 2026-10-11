/** Serializes client translation jobs so the feed does not stampede the model. */
const MAX_CONCURRENT = 2;

type PendingJob = {
  priority: number;
  run: () => void;
};

let active = 0;
const pending: PendingJob[] = [];

function pump(): void {
  while (active < MAX_CONCURRENT && pending.length > 0) {
    pending.sort((a, b) => b.priority - a.priority);
    active += 1;
    const job = pending.shift()!;
    job.run();
  }
}

export function enqueueTranslation<T>(
  job: () => Promise<T>,
  priority = 0
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pending.push({
      priority,
      run: () => {
        void job()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            pump();
          });
      },
    });
    pump();
  });
}
