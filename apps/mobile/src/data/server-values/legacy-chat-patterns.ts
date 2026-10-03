/**
 * Regexes matching legacy Korean DM / listing share templates stored on the server.
 * Not UI copy — pattern matching only.
 */

export const USED_LISTING_SHARE_GREETING =
  /^(?:안녕하세요[!！.]?\s*)?중고\s*거래\s*문의입니다[.!！]?$/i;

export const USED_LISTING_SHARE_MARKET_MSG = /^마켓\s*거래\s*메시지입니다[.!！]?$/;

export const USED_LISTING_LINE_PRODUCT = /^상품\s*[:：]\s*.+$/;

export const USED_LISTING_LINE_PRICE = /^가격\s*[:：]\s*.+$/;

export const USED_LISTING_LINE_WINNING = /^낙찰가\s*[:：]\s*.+$/;

export const USED_LISTING_LINE_LINK = /^링크\s*[:：]\s*.+$/i;

export const USED_LISTING_PRODUCT_CAPTURE = /^상품\s*[:：]\s*(.+)$/m;

export const CHAT_POST_SHARE_NOUN = /님의 게시물/;

export const CHAT_POST_SHARE_AT = /^@\w[\w.-]*님의/;
