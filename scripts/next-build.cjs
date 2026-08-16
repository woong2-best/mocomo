/**
 * Runs `next build` with a heap ceiling that fits the build container.
 *
 * NODE_OPTIONS is inherited by Next's build workers, so the limit must be sized
 * per worker: on Vercel (2 cores / 8GB) a single 6GB ceiling made two workers
 * overcommit and the container SIGKILLed the build.
 */
const os = require("os");
const { spawn } = require("child_process");

const CONCURRENT_WORKERS = 2;
const RESERVED_MB = 1024;
const LOW_MEMORY_MB = 12288;
// Node's own default on an 8GB container; known to fit this build historically.
const LOW_MEMORY_HEAP_MB = 4096;

const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
const lowMemory = totalMb < LOW_MEMORY_MB;
const budgetMb = Math.max(totalMb - RESERVED_MB, 1024);
const heapMb = lowMemory
  ? LOW_MEMORY_HEAP_MB
  : Math.min(8192, Math.max(2048, Math.floor(budgetMb / CONCURRENT_WORKERS)));

const existing = process.env.NODE_OPTIONS ?? "";
const nodeOptions = existing.includes("--max-old-space-size")
  ? existing
  : `${existing} --max-old-space-size=${heapMb}`.trim();

console.log(
  `[next-build] heap limit ${heapMb}MB per worker (system ${totalMb}MB, ${os.cpus().length} cores, lowMemory=${lowMemory})`
);

const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
    ...(lowMemory && !process.env.NEXT_BUILD_CPUS ? { NEXT_BUILD_CPUS: "1" } : {}),
  },
});

child.on("close", (code) => process.exit(code ?? 1));
child.on("error", (err) => {
  console.error("[next-build] failed to start:", err.message);
  process.exit(1);
});
