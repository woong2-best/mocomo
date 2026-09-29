#!/usr/bin/env node
/**
 * Production web deploy: GitHub main only (Vercel Git integration).
 * Does NOT run `vercel --prod` (that uploads the local tree, including uncommitted files).
 */
const { execSync } = require("node:child_process");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] }).trim();
}

function fail(msg) {
  console.error(`\n[deploy:web] ${msg}\n`);
  process.exit(1);
}

try {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  if (branch !== "main") {
    fail(`현재 브랜치가 main이 아닙니다 (${branch}). main에서 push하세요.`);
  }

  const dirty = run("git status --porcelain --untracked-files=no");
  if (dirty) {
    fail(
      "커밋되지 않은 변경이 있습니다. 먼저 commit한 뒤 다시 실행하세요.\n" +
        dirty.split("\n").slice(0, 12).join("\n")
    );
  }

  const local = run("git rev-parse HEAD");
  run("git fetch origin main");
  const remote = run("git rev-parse origin/main");

  if (local !== remote) {
    console.log("[deploy:web] origin/main과 HEAD가 다릅니다. push합니다…");
    run("git push origin main");
  } else {
    console.log("[deploy:web] origin/main과 HEAD 일치:", local.slice(0, 7));
    console.log("[deploy:web] Vercel 재배포가 필요하면 empty commit 후 push:");
    console.log('  git commit --allow-empty -m "chore: trigger Vercel production deploy from main"');
    console.log("  git push origin main");
    run("git push origin main");
  }

  console.log("\n[deploy:web] 완료. Vercel Dashboard → Production 배포가 이 커밋인지 확인하세요.");
  console.log("[deploy:web] `vercel --prod`는 사용하지 마세요 (로컬 미커밋 코드가 prod에 올라갈 수 있음).\n");
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
