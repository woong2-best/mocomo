import test from "node:test";
import assert from "node:assert/strict";
import {
  chatUsedListingListPreview,
  encodeUsedListingMessage,
  parseChatUsedListing,
} from "@/lib/chat-used-listing-share";

const LISTING_ID = "cmui65f0o0001lb0464oil3an";

test("legacy used inquiry becomes a card with the product name and no link note", () => {
  const raw = [
    "안녕하세요! 중고거래 문의입니다.",
    "",
    "상품: 아이폰",
    "가격: $ 500.00",
    `링크: /used/${LISTING_ID}`,
  ].join("\n");

  const parsed = parseChatUsedListing(raw);
  assert.equal(parsed?.listingId, LISTING_ID);
  assert.equal(parsed?.titleHint, "아이폰");
  assert.equal(parsed?.note, null);
  assert.equal(chatUsedListingListPreview(raw), "아이폰");
});

test("marker-only inquiry previews as a used listing", () => {
  const raw = encodeUsedListingMessage(LISTING_ID);
  const parsed = parseChatUsedListing(raw);
  assert.equal(parsed?.listingId, LISTING_ID);
  assert.equal(parsed?.note, null);
  assert.equal(chatUsedListingListPreview(raw), "중고 상품");
});

test("auction note stays above the listing card", () => {
  const raw = `경매 낙찰 안내\n\n${encodeUsedListingMessage(LISTING_ID)}`;
  const parsed = parseChatUsedListing(raw);
  assert.equal(parsed?.listingId, LISTING_ID);
  assert.equal(parsed?.note, "경매 낙찰 안내");
});
