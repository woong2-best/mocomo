/**
 * Type checks, then builds — as two sequential processes.
 *
 * Next type checks inside the build, so the tsc heap and the webpack heap are
 * alive at the same time and an 8GB build container gets OOM killed. Splitting
 * them keeps the same coverage at roughly half the peak memory, and a type
 * error now fails in ~1 minute instead of after a full compile.
 *
 * Deliberately no NODE_OPTIONS tuning: raising the ceiling made Next's workers
 * overcommit the container, and lowering it sent the compile into GC thrash.
 */
const { spawn } = require("child_process");

function run(label, args, env) {
  return new Promise((resolve, reject) => {
    console.log(`[next-build] ${label}`);
    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...env },
    });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} exited with ${code}`))
    );
    child.on("error", reject);
  });
}

async function main() {
  await run("type check", ["tsc", "--noEmit"]);
  await run("next build", ["next", "build"], { NEXT_SKIP_TYPECHECK: "1" });
}

main().catch((err) => {
  console.error(`[next-build] ${err.message}`);
  process.exit(1);
});
