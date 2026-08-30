import test from "node:test";
import assert from "node:assert/strict";
import { DM_CONTENT_MASK, filterDmMessageContent, validateCreatorMarketingText } from "@/lib/chat-content-filter";

test("filterDmMessageContent masks stripe and paypal links", () => {
  const r = filterDmMessageContent("pay at stripe.com or paypal me");
  assert.equal(r.wasFiltered, true);
  assert.equal(r.text, `pay at ${DM_CONTENT_MASK} or ${DM_CONTENT_MASK} me`);
});

test("filterDmMessageContent masks external messengers and payment terms in Korean", () => {
  const r = filterDmMessageContent("카톡이나 텔레그렘으로 연락, 계좌 입금");
  assert.equal(r.wasFiltered, true);
  assert.match(r.text, new RegExp(DM_CONTENT_MASK));
  assert.doesNotMatch(r.text, /카톡|텔레그렘|계좌|입금/);
});

test("validateCreatorMarketingText rejects prohibited payment terms", () => {
  const r = validateCreatorMarketingText("stripe.com으로 결제해 주세요");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /금지/);
});

test("validateCreatorMarketingText accepts benign marketing copy", () => {
  const r = validateCreatorMarketingText("팔로우 감사합니다! 신규 콘텐츠를 확인해 보세요.");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.text, "팔로우 감사합니다! 신규 콘텐츠를 확인해 보세요.");
});
