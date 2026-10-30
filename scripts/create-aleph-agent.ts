/**
 * Issue an Aleph semantic-cache agent key.
 *
 *   npx tsx scripts/create-aleph-agent.ts --name "my-agent" [--daily-limit 1000] [--trust 0.5]
 *
 * Generates a random key, stores only sha256(key) in aleph_agents, and prints the
 * plaintext key exactly once. Needs NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (read from the environment or ./.env.local, ./.env).
 */

import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const KEY_PREFIX = "aleph_";

function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try {
      // Node >= 20.12. Does not override variables that are already set.
      process.loadEnvFile(file);
    } catch {
      /* ignore unreadable env file */
    }
  }
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function parseNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`value out of range for ${raw}: expected ${min}..${max}`);
  }
  return n;
}

async function main(): Promise<void> {
  loadEnvFiles();

  const name = readArg("--name")?.trim();
  if (!name) throw new Error('missing --name "<agent name>"');
  const dailyLimit = Math.trunc(parseNumber(readArg("--daily-limit"), 1000, 1, 1_000_000));
  const trust = parseNumber(readArg("--trust"), 0.5, 0, 1);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  // 32 random bytes, base64url → 43 chars. Hash must match src/lib/aleph-cache.ts hashAgentKey().
  const plaintext = KEY_PREFIX + randomBytes(32).toString("base64url");
  const keyHash = createHash("sha256").update(plaintext, "utf8").digest("hex");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("aleph_agents")
    .insert({ name, key_hash: keyHash, daily_limit: dailyLimit, trust })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(`insert failed: ${error?.message ?? "no id returned"}`);
  }

  console.log("Aleph agent created.");
  console.log(`  id           ${data.id}`);
  console.log(`  name         ${name}`);
  console.log(`  daily_limit  ${dailyLimit}`);
  console.log(`  trust        ${trust}`);
  console.log("");
  console.log("Agent key (shown once — only its sha256 is stored):");
  console.log(`  ${plaintext}`);
  console.log("");
  console.log('Use it as:  Authorization: Bearer <key>');
}

main().catch((err: unknown) => {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
