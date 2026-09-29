"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startUsedTradeChat,
  getUsedListingChatRooms,
} from "@/actions/used-market";
import { cancelUsedAuction } from "@/actions/used-auction";
import { UsedAuctionBidSheet } from "@/components/used/used-auction-bid-sheet";
import { MessageSquare, Gavel, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isUsedRestrictedKind,
  usedAdultVerifyUrl,
} from "@/lib/used-youth-protection";
import type { UsedListingStatus, UsedRestrictedKind } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

function needsPhoneVerification(error: string) {
  return error.includes("휴대폰") || error.includes("phone verification");
}

export function UsedAuctionBottomBar({
  listingId,
  isSeller,
  isLoggedIn,
  status,
  initialBuyerRoomId,
  auctionLive,
  auctionState,
  minBid,
  bidIncrement,
  buyNowPrice,
  isWinningBidder,
  restrictedKind = "NONE",
  viewerAdultVerified = false,
  currency,
  availableMocoBalance,
}: {
  listingId: string;
  isSeller: boolean;
  isLoggedIn: boolean;
  initialFavorited: boolean;
  status: UsedListingStatus;
  chatCount: number;
  initialBuyerRoomId?: string | null;
  auctionLive: boolean;
  auctionState?: string | null;
  minBid: number;
  bidIncrement?: number | null;
  buyNowPrice?: number | null;
  isWinningBidder?: boolean;
  restrictedKind?: UsedRestrictedKind | string;
  viewerAdultVerified?: boolean;
  currency?: string | null;
  availableMocoBalance?: number | null;
}) {
  const { locale } = useLocale();
  const needsAdult =
    isUsedRestrictedKind(restrictedKind) && !isSeller && !viewerAdultVerified;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sellerRooms, setSellerRooms] = useState<{ roomId: string; buyer: { username: string } }[] | null>(
    null
  );
  const [barError, setBarError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function openChat() {
    setBarError("");
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      if (needsPhoneVerification(res.error)) {
        router.push(`/market/verify?callbackUrl=${encodeURIComponent(`/market/${listingId}`)}`);
        return;
      }
      setBarError(res.error);
      return;
    }
    if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  async function openSellerChats() {
    setBarError("");
    if (sellerRooms) {
      if (sellerRooms.length === 1) {
        router.push(`/messages/${sellerRooms[0].roomId}`);
        return;
      }
      return;
    }
    setLoading(true);
    const res = await getUsedListingChatRooms(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      setBarError(res.error);
      return;
    }
    const rooms = res.rooms ?? [];
    if (rooms.length === 0) {
      await openChat();
      return;
    }
    setSellerRooms(rooms);
    if (rooms.length === 1) router.push(`/messages/${rooms[0].roomId}`);
  }

  async function cancelAuction() {
    setConfirmCancel(true);
  }

  async function confirmCancelAuction() {
    setLoading(true);
    setConfirmCancel(false);
    const res = await cancelUsedAuction(listingId);
    setLoading(false);
    if ("error" in res && res.error) setBarError(res.error);
    else router.refresh();
  }

  if (isSeller) {
    return (
      <div className="used-action-bar border-t bg-background z-20 space-y-2">
        {barError && <p className="px-3 pt-2 text-xs text-destructive text-center">{barError}</p>}
        <div className="p-3 pb-safe space-y-2">
        {confirmCancel ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-xs text-destructive">
              {uiText(
                locale,
                "입찰 없는 경매만 취소할 수 있습니다. 취소할까요?",
                "You can only cancel an auction with no bids. Cancel it?"
              )}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={loading}
                onClick={() => void confirmCancelAuction()}
              >
                {uiText(locale, "취소하기", "Cancel auction")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmCancel(false)}>
                {uiText(locale, "닫기", "Close")}
              </Button>
            </div>
          </div>
        ) : auctionLive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-xl"
            disabled={loading}
            onClick={() => void cancelAuction()}
          >
            {uiText(locale, "경매 취소 (입찰 없을 때)", "Cancel auction (no bids)")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full h-12 rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90"
          disabled={loading}
          onClick={() => void openSellerChats()}
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          {loading ? uiText(locale, "불러오는 중…", "Loading…") : uiText(locale, "메시지 보내기", "Message")}
        </Button>
        {sellerRooms && sellerRooms.length > 1 && (
          <ul className="max-h-32 overflow-y-auto rounded-xl border divide-y text-sm">
            {sellerRooms.map((r) => (
              <li key={r.roomId}>
                <Link href={`/messages/${r.roomId}`} className="block px-3 py-2 hover:bg-muted">
                  @{r.buyer.username}
                </Link>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    );
  }

  if (auctionState === "PAYMENT_PENDING" && isWinningBidder && initialBuyerRoomId) {
    return (
      <div className="used-action-bar flex gap-2 border-t bg-background p-3 pb-safe z-20">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {uiText(locale, "낙찰 · 결제 필요", "Won · payment due")}
          </p>
          <p className="text-xs text-muted-foreground">
            {uiText(locale, "기한 내 결제 완료를 신고해 주세요", "Complete payment before the deadline")}
          </p>
        </div>
        <Button asChild size="lg" className="h-12 rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90">
          <Link href={`/messages/${initialBuyerRoomId}`}>
            {uiText(locale, "채팅 · 결제", "Chat · pay")}
          </Link>
        </Button>
      </div>
    );
  }

  if (status === "RESERVED" && isWinningBidder && initialBuyerRoomId) {
    return (
      <div className="used-action-bar flex gap-2 border-t bg-background p-3 pb-safe z-20">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            {uiText(locale, "낙찰되었습니다", "You won the auction")}
          </p>
          <p className="text-xs text-muted-foreground">
            {uiText(locale, "판매자와 채팅으로 거래를 진행하세요", "Chat with the seller to complete the trade")}
          </p>
        </div>
        <Button asChild size="lg" className="h-12 rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90">
          <Link href={`/messages/${initialBuyerRoomId}`}>
            {uiText(locale, "메시지 보내기", "Message")}
          </Link>
        </Button>
      </div>
    );
  }

  if (!auctionLive) {
    return (
      <div className="used-action-bar border-t bg-muted/40 p-4 text-center text-sm text-muted-foreground pb-safe">
        {status === "RESERVED"
          ? uiText(locale, "다른 분과 예약 중이에요", "Reserved for another buyer")
          : uiText(locale, "경매가 종료되었어요", "This auction has ended")}
        {isLoggedIn && status === "SELLING" && (
          <Button
            type="button"
            variant="ghost"
            className="block mx-auto mt-2"
            disabled={loading}
            onClick={() => void openChat()}
          >
            {uiText(locale, "메시지 보내기", "Message")}
          </Button>
        )}
      </div>
    );
  }

  if (needsAdult) {
    return (
      <div className="used-action-bar border-t bg-background p-3 pb-safe z-20">
        {isLoggedIn ? (
          <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90 gap-2">
            <Link href={usedAdultVerifyUrl(listingId, restrictedKind)}>
              <ShieldAlert className="h-5 w-5" />
              {uiText(locale, "성인 인증 후 입찰", "Verify age to bid")}
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90 gap-2">
            <Link href={`/auth/signin?callbackUrl=/market/${listingId}`}>
              <Gavel className="h-5 w-5" />
              {uiText(locale, "로그인 후 입찰", "Sign in to bid")}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="used-action-bar border-t bg-background z-20">
      {barError && <p className="px-3 pt-2 text-xs text-destructive text-center">{barError}</p>}
      <div className="p-3 pb-safe">
      {isLoggedIn ? (
        <UsedAuctionBidSheet
          listingId={listingId}
          minBid={minBid}
          buyNowPrice={buyNowPrice}
          quickBids={[0, 1, 2, 4].map(
            (n) => minBid + n * (bidIncrement && bidIncrement > 0 ? bidIncrement : currency === "usd" ? 100 : 1000)
          )}
          restrictedKind={restrictedKind}
          currency={currency}
          availableMocoBalance={availableMocoBalance}
        />
      ) : (
        <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90 gap-2">
          <Link href={`/auth/signin?callbackUrl=/market/${listingId}`}>
            <Gavel className="h-5 w-5" />
            {uiText(locale, "로그인 후 입찰", "Sign in to bid")}
          </Link>
        </Button>
      )}
      </div>
    </div>
  );
}
