/**
 * Measures how long a client-side navigation waits on the server.
 *
 * A client navigation in the App Router fetches the RSC payload for the target
 * route. Without a `loading.tsx` there is no streamed shell, so the user stares
 * at the previous page for the whole of this time. TopProgressProvider gives up
 * at 4s, so anything past that is a blank wait with no feedback at all.
 */

const BASE = process.env.MEASURE_BASE ?? "https://mocomo.net";
const RUNS = Number(process.env.MEASURE_RUNS ?? 3);
const PROGRESS_DEADLINE_MS = 4_000;

const ROUTES = [
  "/feed",
  "/explore",
  "/discover",
  "/communities",
  "/cosplay",
  "/events",
  "/events/map",
  "/live",
  "/market",
  "/used",
  "/games",
  "/games/ranking",
  "/games/achievements",
  "/games/season",
  "/games/live",
  "/rankings",
  "/premium",
  "/support",
  "/search",
  "/auth/signin",
];

async function timeOnce(path) {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { RSC: "1", "Next-Router-Prefetch": "0" },
      redirect: "manual",
    });
    await res.arrayBuffer();
    return { ms: performance.now() - started, status: res.status };
  } catch (e) {
    return { ms: performance.now() - started, status: `ERR ${e.message}` };
  }
}

async function main() {
  console.log(`base=${BASE} runs=${RUNS}\n`);
  const results = [];

  for (const path of ROUTES) {
    const samples = [];
    let status = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = await timeOnce(path);
      samples.push(r.ms);
      status = r.status;
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    results.push({ path, median, best: samples[0], worst: samples.at(-1), status });
  }

  results.sort((a, b) => b.median - a.median);

  console.log("route".padEnd(24) + "median".padStart(9) + "best".padStart(9) + "worst".padStart(9) + "  status");
  for (const r of results) {
    const flag = r.median > PROGRESS_DEADLINE_MS ? "  <-- past progress bar deadline" : "";
    console.log(
      r.path.padEnd(24) +
        `${r.median.toFixed(0)}ms`.padStart(9) +
        `${r.best.toFixed(0)}ms`.padStart(9) +
        `${r.worst.toFixed(0)}ms`.padStart(9) +
        `  ${r.status}` +
        flag
    );
  }

  const slow = results.filter((r) => r.median > PROGRESS_DEADLINE_MS);
  console.log(`\n${slow.length} of ${results.length} routes exceed the ${PROGRESS_DEADLINE_MS}ms progress deadline.`);
}

main();
