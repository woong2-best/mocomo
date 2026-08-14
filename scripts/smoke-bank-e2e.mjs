/**
 * Full Apick 1원 인증 E2E (실계좌)
 *
 * .env:
 *   APICK_TEST_BANK_CODE=004
 *   APICK_TEST_ACCOUNT_NUM=your-account
 *   APICK_TEST_LEGAL_NAME=홍길동  (예금주명과 일치)
 *
 * Usage: npx tsx --env-file=.env scripts/smoke-bank-e2e.mjs
 */
import { config } from "dotenv";
config();

const bankCode = process.env.APICK_TEST_BANK_CODE?.trim() || "004";
const accountNum = process.env.APICK_TEST_ACCOUNT_NUM?.replace(/\D/g, "") || "";
const legalName = process.env.APICK_TEST_LEGAL_NAME?.trim() || "";

if (!accountNum || !legalName) {
  console.error(
    "Set APICK_TEST_ACCOUNT_NUM and APICK_TEST_LEGAL_NAME in .env for live 1-won test."
  );
  process.exit(1);
}

const { apickAccountRealname, apickTransfer1Won } = await import("../src/lib/apick/client.ts");
const { bankHolderMatchesLegalName } = await import("../src/lib/bank-name-match.ts");
const { generateBankVerifyCode, bankVerifyMemo } = await import(
  "../src/lib/bank-verification-tokens.ts"
);

console.log("1) account_realname...");
const realname = await apickAccountRealname({ bankCode, accountNum });
console.log(realname);
if (!realname.ok) process.exit(1);

console.log("\n2) name match:", bankHolderMatchesLegalName(realname.holderName, legalName));
if (!bankHolderMatchesLegalName(realname.holderName, legalName)) {
  console.error(`Mismatch: account=${realname.holderName} vs legal=${legalName}`);
  process.exit(1);
}

const code = generateBankVerifyCode();
const memo = bankVerifyMemo(code);
console.log("\n3) transfer_1won request memo=", memo);
const transfer = await apickTransfer1Won({ bankCode, accountNum, memo });
console.log(transfer);
if (!transfer.ok) process.exit(1);

const parsed = parseVerifyCodeFromApickMemo(transfer.memo);
console.log("\n✅ 1원 송금 완료 — 입금통장메모:", transfer.memo, "→ 입력 코드:", parsed);
