/** Auction 보증금 — 1 MOCO = $5 USD 가치 */
export const AUCTION_MOCO_USD_VALUE = 5;

/** 입찰 시 동결하는 고정 보증금 (2 MOCO = $10) */
export const AUCTION_BID_DEPOSIT_MOCO = 2;

export const AUCTION_BID_DEPOSIT_USD = AUCTION_BID_DEPOSIT_MOCO * AUCTION_MOCO_USD_VALUE;

export const AUCTION_DEPOSIT_USD_CENTS_PER_MOCO = AUCTION_MOCO_USD_VALUE * 100;

export const AUCTION_DEPOSIT_SOURCE_FORFEIT = "AUCTION_DEPOSIT_FORFEIT";

/** Auction 참여 최소 지갑 잔액 (available MOCO) */
export const AUCTION_MIN_WALLET_MOCO = AUCTION_BID_DEPOSIT_MOCO;

export const INSUFFICIENT_DEPOSIT_ERROR = "auction.insufficientDeposit";

export const AUCTION_SELLER_DEPOSIT_ERROR = "auction.sellerDepositRequired";

export const AUCTION_FORFEIT_PENALTY_MOCO = AUCTION_BID_DEPOSIT_MOCO;
