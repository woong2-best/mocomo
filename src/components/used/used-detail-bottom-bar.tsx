"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleUsedFavorite,
  startUsedTradeChat,
  getUsedListingChatRooms,
} from "@/actions/used-market";
import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UsedListingStatus } from "@prisma/client";

export function UsedDetailBottomBar({
  listingId,
  isSeller,
  isLoggedIn,
  initialFavorited,
  status,
  chatCount,
  initialBuyerRoomId,
}: {
  listingId: string;
  isSeller: boolean;
  isLoggedIn: boolean;
  initialFavorited: boolean;
  status: UsedListingStatus;
  chatCount: number;
  initialBuyerRoomId?: string | null;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [sellerRooms, setSellerRooms] = useState<{ roomId: string; buyer: { username: string } }[] | null>(
    null
  );

  async function toggleFav() {
    if (!isLoggedIn) {
      router.push(`/auth/signin?callbackUrl=/used/${listingId}`);
      return;
    }
    const res = await toggleUsedFavorite(listingId);
    if ("favorited" in res) setFavorited(res.favorited);
  }

  async function openChat() {
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      if (res.error.includes("휴대폰")) {
        router.push(`/used/verify?callbackUrl=/used/${listingId}`);
        return;
      }
      alert(res.error);
      return;
    }
    if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  async function openSellerChats() {
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
      alert(res.error);
      return;
    }
    const rooms = res.rooms ?? [];
    setSellerRooms(rooms);
    if (rooms.length === 0) {
      alert("아직 문의 채팅이 없습니다.");
      return;
    }
    if (rooms.length === 1) {
      router.push(`/messages/${rooms[0].roomId}`);
      return;
    }
  }

  if (isSeller) {
    return (
      <div className="sticky bottom-0 border-t bg-background p-3 pb-safe z-20">
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
    );
  }

  if (status !== "SELLING") {
    return (
      <div className="sticky bottom-0 border-t bg-muted/40 p-4 text-center text-sm text-muted-foreground pb-safe">
        {status === "RESERVED" ? "다른 분과 예약 중이에요" : "거래가 완료된 상품이에요"}
      </div>
    );
  }

  const existingRoom = initialBuyerRoomId;

  return (
    <div className="sticky bottom-0 flex gap-2 border-t bg-background p-3 pb-safe z-20">
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
      {existingRoom ? (
        <Button asChild variant="secondary" size="lg" className="flex-1 h-12 rounded-xl font-semibold">
          <Link href={`/messages/${existingRoom}`}>대화 중인 채팅</Link>
        </Button>
      ) : isLoggedIn ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1 h-12 rounded-xl font-semibold gap-2"
          disabled={loading}
          onClick={() => void openChat()}
        >
          <MessageCircle className="h-5 w-5" />
          {loading ? "연결 중…" : "채팅하기"}
        </Button>
      ) : (
        <Button asChild variant="secondary" size="lg" className="flex-1 h-12 rounded-xl">
          <Link href={`/auth/signin?callbackUrl=/used/${listingId}`}>로그인 후 채팅</Link>
        </Button>
      )}
    </div>
  );
}
