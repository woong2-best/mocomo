"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleUsedFavorite,
  startUsedTradeChat,
  getUsedListingChatRooms,
} from "@/actions/used-market";
import { cancelUsedAuction } from "@/actions/used-auction";
import { UsedAuctionBidSheet } from "@/components/used/used-auction-bid-sheet";
import { Heart, MessageCircle, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isUsedRestrictedKind,
  usedAdultVerifyUrl,
} from "@/lib/used-youth-protection";
import type { UsedListingStatus, UsedRestrictedKind } from "@prisma/client";
import { ShieldAlert } from "lucide-react";

export function UsedAuctionBottomBar({
  listingId,
  isSeller,
  isLoggedIn,
  initialFavorited,
  status,
  chatCount,
  initialBuyerRoomId,
  auctionLive,
  minBid,
  buyNowPrice,
  isWinningBidder,
  restrictedKind = "NONE",
  viewerAdultVerified = false,
}: {
  listingId: string;
  isSeller: boolean;
  isLoggedIn: boolean;
  initialFavorited: boolean;
  status: UsedListingStatus;
  chatCount: number;
  initialBuyerRoomId?: string | null;
  auctionLive: boolean;
  minBid: number;
  buyNowPrice?: number | null;
  isWinningBidder?: boolean;
  restrictedKind?: UsedRestrictedKind | string;
  viewerAdultVerified?: boolean;
}) {
  const needsAdult =
    isUsedRestrictedKind(restrictedKind) && !isSeller && !viewerAdultVerified;
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [sellerRooms, setSellerRooms] = useState<{ roomId: string; buyer: { username: string } }[] | null>(
    null
  );
  const [barError, setBarError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function toggleFav() {
    if (!isLoggedIn) {
      router.push(`/auth/signin?callbackUrl=/used/${listingId}`);
      return;
    }
    const res = await toggleUsedFavorite(listingId);
    if ("favorited" in res) setFavorited(res.favorited);
  }

  async function openChat() {
    setBarError("");
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      if (res.error.includes("휴대폰")) {
        router.push(`/used/verify?callbackUrl=/used/${listingId}`);
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
    setSellerRooms(rooms);
    if (rooms.length === 0) {
      setBarError("아직 문의 채팅이 없습니다.");
      return;
    }
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
            <p className="text-xs text-destructive">입찰 없는 경매만 취소할 수 있습니다. 취소할까요?</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={loading}
                onClick={() => void confirmCancelAuction()}
              >
                취소하기
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmCancel(false)}>
                닫기
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
            경매 취소 (입찰 없을 때)
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full h-12 rounded-xl font-semibold"
          disabled={loading}
          onClick={() => void openSellerChats()}
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          {loading
            ? "불러오는 중…"
            : chatCount > 0
              ? `대화 중인 채팅 ${chatCount}`
              : "채팅 문의 없음"}
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

  if (status === "RESERVED" && isWinningBidder && initialBuyerRoomId) {
    return (
      <div className="used-action-bar flex gap-2 border-t bg-background p-3 pb-safe z-20">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-bold text-green-600 dark:text-green-400">낙찰되었습니다</p>
          <p className="text-xs text-muted-foreground">판매자와 채팅으로 거래를 진행하세요</p>
        </div>
        <Button asChild variant="secondary" size="lg" className="h-12 rounded-xl font-semibold">
          <Link href={`/messages/${initialBuyerRoomId}`}>채팅 열기</Link>
        </Button>
      </div>
    );
  }

  if (!auctionLive) {
    return (
      <div className="used-action-bar border-t bg-muted/40 p-4 text-center text-sm text-muted-foreground pb-safe">
        {status === "RESERVED" ? "다른 분과 예약 중이에요" : "경매가 종료되었어요"}
        {isLoggedIn && status === "SELLING" && (
          <Button
            type="button"
            variant="ghost"
            className="block mx-auto mt-2"
            disabled={loading}
            onClick={() => void openChat()}
          >
            일반 문의 채팅
          </Button>
        )}
      </div>
    );
  }

  if (needsAdult) {
    return (
      <div className="used-action-bar flex gap-2 border-t bg-background p-3 pb-safe z-20">
        <button
          type="button"
          onClick={() => void toggleFav()}
          className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${
            favorited ? "bg-orange-500/10 border-orange-400 text-orange-500" : "border-border"
          }`}
          aria-label="관심"
        >
          <Heart className={`h-6 w-6 ${favorited ? "fill-current" : ""}`} />
        </button>
        {isLoggedIn ? (
          <Button asChild variant="secondary" size="lg" className="flex-1 h-12 rounded-xl gap-2">
            <Link href={usedAdultVerifyUrl(listingId, restrictedKind)}>
              <ShieldAlert className="h-5 w-5" />
              성인 인증 후 입찰
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" size="lg" className="flex-1 h-12 rounded-xl gap-2">
            <Link href={`/auth/signin?callbackUrl=/used/${listingId}`}>
              <Gavel className="h-5 w-5" />
              로그인 후 입찰
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="used-action-bar border-t bg-background z-20">
      {barError && <p className="px-3 pt-2 text-xs text-destructive text-center">{barError}</p>}
      <div className="flex gap-2 p-3 pb-safe">
      <button
        type="button"
        onClick={() => void toggleFav()}
        className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${
          favorited ? "bg-orange-500/10 border-orange-400 text-orange-500" : "border-border"
        }`}
        aria-label="관심"
      >
        <Heart className={`h-6 w-6 ${favorited ? "fill-current" : ""}`} />
      </button>
      {isLoggedIn ? (
        <UsedAuctionBidSheet
          listingId={listingId}
          minBid={minBid}
          buyNowPrice={buyNowPrice}
          restrictedKind={restrictedKind}
        />
      ) : (
        <Button asChild variant="secondary" size="lg" className="flex-1 h-12 rounded-xl gap-2">
          <Link href={`/auth/signin?callbackUrl=/used/${listingId}`}>
            <Gavel className="h-5 w-5" />
            로그인 후 입찰
          </Link>
        </Button>
      )}
      </div>
    </div>
  );
}
