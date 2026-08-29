import test from "node:test";
import assert from "node:assert/strict";
import { DM_CONTENT_MASK, filterDmMessageContent } from "@/lib/chat-content-filter";

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

test("filterDmMessageContent leaves benign text unchanged", () => {
  const r = filterDmMessageContent("안녕하세요! 코스프레 사진 잘 봤어요");
  assert.equal(r.wasFiltered, false);
  assert.equal(r.text, "안녕하세요! 코스프레 사진 잘 봤어요");
});
