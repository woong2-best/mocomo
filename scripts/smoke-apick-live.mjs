/**
 * Apick live API smoke test
 * Usage: npx tsx --env-file=.env scripts/smoke-apick-live.mjs
 */
import { config } from "dotenv";
config();

const KEY = process.env.APICK_API_KEY?.trim();
if (!KEY) {
  console.error("APICK_API_KEY missing");
  process.exit(1);
}

const { apickAccountRealname } = await import("../src/lib/apick/client.ts");
const result = await apickAccountRealname({ bankCode: "004", accountNum: "00000123456789" });
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
