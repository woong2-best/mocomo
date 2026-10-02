import fs from "node:fs";
const p = "src/components/wallet/gem-balance-panel.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/import \{ uiText \} from "@\/lib\/i18n\/ui-text";\n/, "");
s = s.replace(/  const u = \(ko: string, en: string\) => uiText\(locale, ko, en\);\n/, "");
const pairs = [
  ['u("충전 전 약관에 동의해 주세요.", "Please accept the terms before topping up.")', 't("wallet.topup.acceptTerms")'],
  ['u("충전할 MOCO 수량을 입력해 주세요.", "Enter how many MOCO to buy.")', 't("wallet.topup.enterAmount")'],
  ['u("Stripe를 불러오지 못했습니다.", "Couldn\'t load Stripe.")', 't("wallet.topup.stripeLoadFailed")'],
  ['u("카드 인증에 실패했습니다.", "Card verification failed.")', 't("wallet.topup.cardAuthFailed")'],
  ['u("결제가 완료되지 않았습니다.", "Payment wasn\'t completed.")', 't("wallet.topup.paymentIncomplete")'],
  ['u("충전이 완료되었습니다.", "Top-up complete.")', 't("wallet.topup.complete")'],
  ['u("약관에 동의한 뒤 다시 시도해 주세요.", "Accept the terms and try again.")', 't("wallet.topup.acceptTermsRetry")'],
  ['u("1 MOCO 이상 입력해 주세요.", "Enter at least 1 MOCO.")', 't("wallet.topup.minOneMoco")'],
  ['u("등록된 카드가 없습니다. 아래에서 카드를 추가해 주세요.", "No saved card. Add one below.")', 't("wallet.topup.noSavedCardHint")'],
  ['u("등록된 카드가 없습니다.", "No saved card.")', 't("wallet.topup.noSavedCard")'],
  ['u("등록된 카드로 결제 중…", "Paying with saved card…")', 't("wallet.topup.payingSavedCard")'],
  ['u("결제에 실패했습니다. 다시 시도해 주세요.", "Payment failed. Try again.")', 't("wallet.topup.paymentFailed")'],
  ['u("결제에 실패했습니다.", "Payment failed.")', 't("wallet.topup.paymentFailShort")'],
  ['u("수량을 확인한 뒤 [확인]을 눌러 주세요.", "Confirm amount, then press [OK].")', 't("wallet.topup.confirmAmount")'],
  ['u("결제 완료", "Payment complete")', 't("wallet.topup.paymentSuccess")'],
  ['u("결제 실패", "Payment failed")', 't("wallet.topup.paymentFailShort")'],
  ['u("현재 잔액", "Current balance")', 't("wallet.topup.currentBalance")'],
  ['u("MOCO 상품 가격", "MOCO price")', 't("wallet.topup.mocoPrice")'],
  ['u("결제 대행 수수료 (PG 실비)", "Payment processing fee")', 't("wallet.topup.pgFee")'],
  ['u("최종 결제 금액", "Total charge")', 't("wallet.topup.totalCharge")'],
  ['u("1 단위 정수 · 최소", "Whole units · min")', 't("wallet.topup.wholeUnitsMin")'],
  ['u(" (기본)", " (default)")', 't("wallet.topup.cardDefault")'],
  ['u("결제 카드", "Card")', 't("wallet.topup.cardLabel")'],
  ['u("결제 화면으로 이동 중…", "Opening payment…")', 't("wallet.topup.openingPayment")'],
  ['u("MOCO 잔액이 부족합니다", "Low MOCO balance")', 't("wallet.topup.lowBalance")'],
  ['u("키패드로 충전 수량을 입력해 주세요.", "Enter a top-up amount on the keypad.")', 't("wallet.topup.keypadHint")'],
  ['u("지우기", "Clear")', 't("wallet.topup.clear")'],
  ['u("확인", "OK")', 't("wallet.topup.ok")'],
  ['u("충전 내역", "Top-up history")', 't("wallet.topup.history")'],
  ['u(" · 일부 사용", " · partially used")', 't("wallet.topup.partiallyUsed")'],
  ['u("잔여", "left")', 't("wallet.topup.remaining")'],
  [
    'u(\n            "먼저 ATM [확인]을 누른 뒤 카드를 리더기에 넣어 주세요.",\n            "Press [OK] on the ATM first, then insert your card."\n          )',
    't("wallet.topup.atmInsertCard")',
  ],
  [
    'u(\n        "카드를 선택한 뒤 리더기 슬롯 방향으로 밀어 넣어 주세요.",\n        "Select a card and insert it into the reader slot."\n      )',
    't("wallet.topup.swipeCard")',
  ],
];
for (const [a, b] of pairs) s = s.split(a).join(b);
s = s.replace(
  /setStatusLine\(\s*u\(\s*`최소 \$\{minTopupMoco\} MOCO부터 충전할 수 있습니다\.`,\s*`Minimum top-up is \$\{minTopupMoco\} MOCO\.`\s*\)\s*\)/g,
  'setStatusLine(t("wallet.topup.minAmount", { min: String(minTopupMoco) }))'
);
s = s.replace(
  /setError\(\s*u\(\s*`최소 \$\{minTopupMoco\} MOCO부터 충전할 수 있습니다\.`,\s*`Minimum top-up is \$\{minTopupMoco\} MOCO\.`\s*\)\s*\)/g,
  'setError(t("wallet.topup.minAmount", { min: String(minTopupMoco) }))'
);
s = s.replace(
  /u\(\s*`10개 묶음 구매 시 PG 고정 수수료 절약 약 \$\{formatUsdCents\(bulkSaveCents\)\}`,\s*`Buying in bundles of 10 saves about \$\{formatUsdCents\(bulkSaveCents\)\} in fixed PG fees\.`\s*\)/g,
  't("wallet.topup.bulkSaveHint", { amount: formatUsdCents(bulkSaveCents) })'
);
fs.writeFileSync(p, s);
console.log("remaining u(", (s.match(/\bu\(/g) || []).length);
