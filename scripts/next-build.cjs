/**
 * Runs `next build` with a heap ceiling sized to the machine.
 * The default V8 limit (~4GB) is not enough for this app and the build worker
 * dies with "Ineffective mark-compacts near heap limit".
 */
const os = require("os");
const { spawn } = require("child_process");

const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
const heapMb = Math.min(8192, Math.max(4096, Math.floor(totalMb * 0.75)));

const existing = process.env.NODE_OPTIONS ?? "";
const nodeOptions = existing.includes("--max-old-space-size")
  ? existing
  : `${existing} --max-old-space-size=${heapMb}`.trim();

console.log(`[next-build] heap limit ${heapMb}MB (system ${totalMb}MB)`);

const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("close", (code) => process.exit(code ?? 1));
child.on("error", (err) => {
  console.error("[next-build] failed to start:", err.message);
  process.exit(1);
});
