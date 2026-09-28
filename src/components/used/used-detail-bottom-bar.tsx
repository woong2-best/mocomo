"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startUsedTradeChat,
  getUsedListingChatRooms,
} from "@/actions/used-market";
import { Button } from "@/components/ui/button";
import {
  isUsedRestrictedKind,
  usedAdultVerifyUrl,
} from "@/lib/used-youth-protection";
import type { UsedListingStatus, UsedRestrictedKind } from "@prisma/client";
import { ShieldAlert } from "lucide-react";

function needsPhoneVerification(error: string) {
  return error.includes("휴대폰") || error.includes("phone verification");
}

export function UsedDetailBottomBar({
  listingId,
  isSeller,
  isLoggedIn,
  status,
  chatCount,
  initialBuyerRoomId,
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
  restrictedKind?: UsedRestrictedKind | string;
  viewerAdultVerified?: boolean;
}) {
  const needsAdult =
    isUsedRestrictedKind(restrictedKind) && !isSeller && !viewerAdultVerified;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sellerRooms, setSellerRooms] = useState<{ roomId: string; buyer: { username: string } }[] | null>(
    null
  );
  const [barError, setBarError] = useState("");

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
      if ("needsAdultVerify" in res && res.needsAdultVerify) {
        router.push(usedAdultVerifyUrl(listingId, restrictedKind));
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
    if (rooms.length === 1) {
      router.push(`/messages/${rooms[0].roomId}`);
      return;
    }
  }

  if (isSeller) {
    return (
      <div className="used-action-bar border-t bg-background z-20">
        {barError && (
          <p className="px-3 pt-2 text-xs text-destructive text-center">{barError}</p>
        )}
        <div className="p-3 pb-safe">
        <Button
          type="button"
          size="lg"
          className="w-full h-12 rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90"
          disabled={loading}
          onClick={() => void openSellerChats()}
        >
          {loading ? "불러오는 중…" : chatCount > 0 ? `메시지 보내기 · ${chatCount}` : "메시지 보내기"}
        </Button>
        {sellerRooms && sellerRooms.length > 1 && (
          <ul className="mt-2 max-h-32 overflow-y-auto rounded-xl border divide-y text-sm">
            {sellerRooms.map((r) => (
              <li key={r.roomId}>
                <Link
                  href={`/messages/${r.roomId}`}
                  className="block px-3 py-2 hover:bg-muted"
                >
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

  if (status !== "SELLING") {
    return (
      <div className="used-action-bar border-t bg-muted/40 p-4 text-center text-sm text-muted-foreground pb-safe">
        {status === "RESERVED" ? "다른 분과 예약 중이에요" : "거래가 완료된 상품이에요"}
      </div>
    );
  }

  const existingRoom = initialBuyerRoomId;

  if (needsAdult) {
    return (
      <div className="used-action-bar border-t bg-background p-3 pb-safe z-20">
        {isLoggedIn ? (
          <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90 gap-2">
            <Link href={usedAdultVerifyUrl(listingId, restrictedKind)}>
              <ShieldAlert className="h-5 w-5" />
              성인 인증 후 채팅
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90">
            <Link href={`/auth/signin?callbackUrl=/market/${listingId}`}>로그인 후 성인 인증</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="used-action-bar border-t bg-background z-20">
      {barError && (
        <p className="px-3 pt-2 text-xs text-destructive text-center">{barError}</p>
      )}
      <div className="p-3 pb-safe">
      {existingRoom ? (
        <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90">
          <Link href={`/messages/${existingRoom}`}>메시지 보내기</Link>
        </Button>
      ) : isLoggedIn ? (
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90"
          disabled={loading}
          onClick={() => void openChat()}
        >
          {loading ? "연결 중…" : "메시지 보내기"}
        </Button>
      ) : (
        <Button asChild size="lg" className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90">
          <Link href={`/auth/signin?callbackUrl=/market/${listingId}`}>로그인 후 채팅</Link>
        </Button>
      )}
      </div>
    </div>
  );
}
