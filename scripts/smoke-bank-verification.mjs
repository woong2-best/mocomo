/**
 * Apick 1원 인증 dev-mode smoke test (APICK_DEV_LOG=true, DB optional)
 * Usage: node scripts/smoke-bank-verification.mjs
 */
import { config } from "dotenv";
config();

process.env.APICK_DEV_LOG = process.env.APICK_DEV_LOG || "true";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const { apickAccountRealname, apickTransfer1Won, isApickConfigured } = await import(
  "../src/lib/apick/client.ts"
);
const { bankHolderMatchesLegalName } = await import("../src/lib/bank-name-match.ts");
const { generateBankVerifyCode, bankVerifyMemo } = await import(
  "../src/lib/bank-verification-tokens.ts"
);

console.log("Apick configured:", isApickConfigured());

const bankCode = "004";
const accountNum = "12345678901234";
const legalName = "개발테스트";

const realname = await apickAccountRealname({ bankCode, accountNum });
console.log("account_realname:", realname.ok ? realname.holderName : realname.error);

if (realname.ok) {
  const match = bankHolderMatchesLegalName(realname.holderName, legalName);
  console.log("name match (개발테스트):", match);
}

const code = generateBankVerifyCode();
const memo = bankVerifyMemo(code);
const transfer = await apickTransfer1Won({ bankCode, accountNum, memo });
console.log("transfer_1won:", transfer.ok ? { memo: transfer.memo, devCode: code } : transfer.error);

console.log("\nSmoke OK — dev flow reachable");
