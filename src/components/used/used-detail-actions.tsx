"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleUsedFavorite,
  updateUsedListingStatus,
  deleteUsedListing,
} from "@/actions/used-market";
import { UsedTradeChatButton } from "@/components/used/used-trade-chat-button";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UsedDetailActions({
  listingId,
  isSeller,
  isLoggedIn,
  initialFavorited,
  status,
}: {
  listingId: string;
  isSeller: boolean;
  isLoggedIn: boolean;
  initialFavorited: boolean;
  status: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggleFav() {
    if (!isLoggedIn) {
      router.push("/auth/signin?callbackUrl=/used/" + listingId);
      return;
    }
    const res = await toggleUsedFavorite(listingId);
    if ("favorited" in res) setFavorited(res.favorited);
  }

  async function setStatus(next: "RESERVED" | "SOLD" | "SELLING") {
    setBusy(true);
    await updateUsedListingStatus(listingId, next);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("글을 삭제할까요?")) return;
    await deleteUsedListing(listingId);
    router.push("/used/my");
  }

  if (isSeller) {
    return (
      <div className="space-y-2 p-4 border-t bg-background">
        <p className="text-xs text-muted-foreground font-medium">내 판매 관리</p>
        <div className="flex flex-wrap gap-2">
          {status !== "RESERVED" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("RESERVED")}
              className="flex-1 min-w-[100px] h-10 rounded-xl border border-border bg-muted text-sm font-semibold"
            >
              예약중
            </button>
          )}
          {status !== "SOLD" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("SOLD")}
              className="flex-1 min-w-[100px] h-10 rounded-xl bg-neutral-800 text-white text-sm font-semibold"
            >
              거래완료
            </button>
          )}
          {status !== "SELLING" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("SELLING")}
              className="flex-1 min-w-[100px] h-10 rounded-xl border text-sm"
            >
              판매중
            </button>
          )}
        </div>
        <button type="button" onClick={remove} className="w-full text-xs text-destructive py-2">
          글 삭제
        </button>
      </div>
    );
  }

  if (status !== "SELLING") {
    return (
      <div className="p-4 border-t bg-muted/30 text-center text-sm text-muted-foreground">
        {status === "RESERVED" ? "다른 분과 예약 중이에요" : "거래가 완료된 상품이에요"}
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-4 border-t bg-background sticky bottom-0 lg:bottom-0 pb-safe">
      <button
        type="button"
        onClick={toggleFav}
        className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${
          favorited ? "bg-red-50 border-red-200 text-red-500" : "border-border"
        }`}
        aria-label="관심"
      >
        <Heart className={`h-5 w-5 ${favorited ? "fill-current" : ""}`} />
      </button>
      {isLoggedIn ? (
        <UsedTradeChatButton listingId={listingId} />
      ) : (
        <Button asChild variant="secondary" size="lg" className="flex-1 h-12">
          <a href={`/auth/signin?callbackUrl=/used/${listingId}`}>로그인 후 채팅</a>
        </Button>
      )}
    </div>
  );
}
