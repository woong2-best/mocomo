/**
 * .env 에 SUPABASE_DB_PASSWORD (또는 DATABASE_URL) 가 있을 때
 * 풀러 리전을 자동으로 찾습니다.
 *
 * 사용: npx tsx scripts/find-supabase-pooler.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import net from "net";

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
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    /* .env 없음 */
  }
}

loadEnvFile();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "wijmhtyuhhdupddtlcdh";

function passwordFromEnv(): string | null {
  if (process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_DB_PASSWORD !== "REPLACE_DB_PASSWORD") {
    return process.env.SUPABASE_DB_PASSWORD;
  }
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) return null;
  try {
    const u = new URL(url.replace(/^postgresql:/, "postgres:"));
    return decodeURIComponent(u.password);
  } catch {
    return null;
  }
}

const REGIONS = [
  "ap-northeast-2",
  "ap-northeast-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "sa-east-1",
];

function tryPort(host: string, port: number, ms = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: ms });
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const password = passwordFromEnv();
  if (!password) {
    console.error("❌ .env 에 SUPABASE_DB_PASSWORD 를 넣거나, DATABASE_URL 에 실제 비밀번호를 설정하세요.");
    console.error("   (지금은 REPLACE_DB_PASSWORD 상태일 수 있습니다)");
    process.exit(1);
  }

  console.log(`프로젝트: ${PROJECT_REF}`);
  console.log("6543(트랜잭션 풀러) 포트 연결 가능한 리전 검색 중...\n");

  const reachable: string[] = [];
  for (const region of REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const ok = await tryPort(host, 6543);
    if (ok) {
      reachable.push(region);
      console.log(`✅ ${region} — ${host}:6543 연결됨`);
    } else {
      console.log(`   ${region} — 연결 실패`);
    }
  }

  if (reachable.length === 0) {
    console.error("\n❌ 모든 리전에서 6543 포트 연결 실패. 방화벽/VPN을 확인하세요.");
    process.exit(1);
  }

  const region = reachable[0];
  const enc = encodeURIComponent(password);
  console.log("\n--- .env 에 붙여넣기 (비밀번호는 이미 .env 에 있다고 가정) ---\n");
  console.log(
    `DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"`
  );
  console.log(
    `DIRECT_URL="postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require"`
  );
  console.log(`\n권장 SUPABASE_REGION="${region}"`);
  console.log("\n다음: npx prisma db push");
}

main();
