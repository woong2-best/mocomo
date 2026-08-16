/**
 * Type checks, then builds — as two sequential processes.
 *
 * Next runs type checking inside the build, so on an 8GB container the webpack
 * heap and the tsc heap are alive at the same time and the container OOM kills
 * the build. Running tsc first keeps the same safety with half the peak memory.
 *
 * NODE_OPTIONS is inherited by Next's workers, so the heap ceiling is sized per
 * worker rather than for the whole container.
 */
const os = require("os");
const { spawn } = require("child_process");

const CONCURRENT_WORKERS = 2;
const RESERVED_MB = 1024;
const LOW_MEMORY_MB = 12288;
// Small containers build with a single worker, so it can take most of the box.
const LOW_MEMORY_HEAP_MB = 6144;

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

const buildEnv = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
  NEXT_SKIP_TYPECHECK: "1",
  ...(lowMemory && !process.env.NEXT_BUILD_CPUS ? { NEXT_BUILD_CPUS: "1" } : {}),
};

function run(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`[next-build] ${label}`);
    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: buildEnv,
    });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} exited with ${code}`))
    );
    child.on("error", reject);
  });
}

async function main() {
  console.log(
    `[next-build] heap ${heapMb}MB per worker (system ${totalMb}MB, ${os.cpus().length} cores, lowMemory=${lowMemory})`
  );
  await run("type check", ["tsc", "--noEmit"]);
  await run("next build", ["next", "build"]);
}

main().catch((err) => {
  console.error(`[next-build] ${err.message}`);
  process.exit(1);
});
