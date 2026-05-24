import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  } catch {
    /* */
  }
}

loadEnvFile();

const ref = process.env.SUPABASE_PROJECT_REF ?? "wijmhtyuhhdupddtlcdh";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password || password === "REPLACE_DB_PASSWORD") {
  console.error("SUPABASE_DB_PASSWORD 없음");
  process.exit(1);
}

const enc = encodeURIComponent(password);
const regions = [
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-south-1",
];

for (const region of regions) {
  const direct = `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
  const pooled = `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require`;
  process.stdout.write(`${region} ... `);
  try {
    execSync("npx prisma db execute --stdin", {
      env: { ...process.env, DIRECT_URL: direct, DATABASE_URL: pooled },
      input: "SELECT 1 as ok;",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 25000,
    });
    console.log("OK ✅");
    console.log("\n성공 리전:", region);
    console.log(`SUPABASE_REGION="${region}"`);
    console.log(`DIRECT_URL="${direct}"`);
    console.log(`DATABASE_URL="${pooled}"`);
    process.exit(0);
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer };
    const msg = (err.stderr?.toString() || err.stdout?.toString() || String(e)).split("\n")[0];
    console.log(msg.slice(0, 120));
  }
}

// direct host fallback
console.log("\n직접 호스트 시도...");
const directHost = `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres?sslmode=require`;
try {
  execSync("npx prisma db execute --stdin", {
    env: { ...process.env, DIRECT_URL: directHost, DATABASE_URL: directHost },
    input: "SELECT 1;",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 25000,
  });
  console.log("db.xxx:5432 OK");
} catch (e: unknown) {
  const err = e as { stderr?: Buffer };
  console.log("실패:", err.stderr?.toString().slice(0, 200));
}

console.error("\n모든 리전 실패 — Connect 화면에서 Prisma URI 를 복사해 주세요.");
process.exit(1);
