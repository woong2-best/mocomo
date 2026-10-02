import { execSync } from "node:child_process";

const folders = [
  "src/app/admin",
  "src/actions",
  "src/components/admin",
  "src/components/support",
  "src/components/reels",
  "src/components/webtoon-studio",
  "src/components/streaming-accounts",
  "src/app/messages",
  "src/lib",
];

for (const f of folders) {
  const label = f.replace(/\//g, " ");
  console.log("\n====", f);
  try {
    execSync(`node scripts/i18n/batch-inline-folder.mjs ${f} "inline EN ${label}"`, { stdio: "inherit" });
  } catch (e) {
    if ((e.status ?? 1) !== 2) throw e;
  }
}
