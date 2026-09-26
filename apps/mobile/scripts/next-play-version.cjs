const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appJsonPath = path.join(root, "app.json");
const gradlePath = path.join(root, "android", "app", "build.gradle");
const ledgerPath = path.join(root, "play-version.json");

function readLedger() {
  if (!fs.existsSync(ledgerPath)) return 0;
  const parsed = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  return Number(parsed.lastVersionCode) || 0;
}

const appRaw = fs.readFileSync(appJsonPath, "utf8");
const gradleRaw = fs.readFileSync(gradlePath, "utf8");
const appCode = Number((appRaw.match(/"versionCode":\s*(\d+)/) || [])[1] || 0);
const gradleCode = Number((gradleRaw.match(/versionCode\s+(\d+)/) || [])[1] || 0);
const versionName = (appRaw.match(/"version":\s*"([^"]+)"/) || [])[1] || "1.0.0";
const used = Math.max(appCode, gradleCode, readLedger());
const next = used + 1;

const parts = versionName.split(".");
const tail = Number(parts[parts.length - 1]);
parts[parts.length - 1] = String(Number.isFinite(tail) ? tail + 1 : 1);
const nextName = parts.join(".");

const nextApp = appRaw
  .replace(/"version":\s*"[^"]+"/, `"version": "${nextName}"`)
  .replace(/"versionCode":\s*\d+/, `"versionCode": ${next}`);
const nextGradle = gradleRaw
  .replace(/versionCode\s+\d+/, `versionCode ${next}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${nextName}"`);

fs.writeFileSync(appJsonPath, nextApp);
fs.writeFileSync(gradlePath, nextGradle);
fs.writeFileSync(
  ledgerPath,
  `${JSON.stringify({ lastVersionCode: next, versionName: nextName }, null, 2)}\n`
);

console.log(`Play versionCode ${used} -> ${next} (${nextName})`);
