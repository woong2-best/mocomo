"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { placeUsedAuctionBid } from "@/actions/used-auction";
import { formatUsedPrice, parseUsedAmountInput } from "@/lib/used-market";
import { errorText } from "@/lib/i18n/error-text";
import { useLocale } from "@/components/providers/locale-provider";

type Bid = {
  id: string;
  amount: number;
  createdAt: string;
  name: string;
  mine: boolean;
};

type RoomListing = {
  id: string;
  title: string;
  image: string | null;
  currency: string;
  minNextBid: number | null;
  currentBidAmount: number | null;
  auctionLive: boolean;
  isOwner: boolean;
  isLeader: boolean;
  messageRoomId: string | null;
};

export function AuctionBidRoom({
  listing,
  initialBids,
}: {
  listing: RoomListing;
  initialBids: Bid[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [bids, setBids] = useState(initialBids);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [messageRoomId, setMessageRoomId] = useState(listing.messageRoomId);
  const [leader, setLeader] = useState(listing.isLeader);
  const canBid = listing.auctionLive && !listing.isOwner;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canBid || busy) return;
    const amount = parseUsedAmountInput(text, listing.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("ui.enter_a_bid"));
      return;
    }
    setBusy(true);
    setError("");
    const res = await placeUsedAuctionBid(listing.id, amount, true);
    setBusy(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    if ("amount" in res && res.amount) {
      setBids((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          amount: res.amount,
          createdAt: new Date().toISOString(),
          name: t("ui.you"),
          mine: true,
        },
      ]);
      setText("");
      setLeader(true);
      if ("chatRoomId" in res && res.chatRoomId) setMessageRoomId(res.chatRoomId);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {listing.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-muted" />
        )}
        <div className="min-w-0">
          <p className="truncate font-bold">{listing.title}</p>
          <p className="text-sm text-muted-foreground">
            {listing.currentBidAmount
              ? formatUsedPrice(listing.currentBidAmount, listing.currency)
              : listing.minNextBid
                ? formatUsedPrice(listing.minNextBid, listing.currency)
                : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {bids.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">{t("ui.no_bids_yet")}</p>
        ) : (
          bids.map((bid) => (
            <div key={bid.id} className={bid.mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  bid.mine
                    ? "max-w-[80%] rounded-2xl bg-folk-terracotta px-3 py-2 text-white"
                    : "max-w-[80%] rounded-2xl bg-muted px-3 py-2"
                }
              >
                <p className="text-xs opacity-80">{bid.name}</p>
                <p className="text-base font-bold">{formatUsedPrice(bid.amount, listing.currency)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {leader && messageRoomId ? (
        <div className="px-4 pb-2">
          <Link href={`/messages/${messageRoomId}`} className="text-sm font-bold text-folk-terracotta">
            {t("ui.message")}
          </Link>
        </div>
      ) : null}

      {canBid ? (
        <form onSubmit={(e) => void submit(e)} className="border-t p-3 pb-safe">
          {error ? <p className="mb-2 text-center text-xs text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder={t("ui.enter_a_bid")}
              className="h-12 flex-1 rounded-xl border bg-background px-3 text-base"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-12 rounded-xl bg-folk-terracotta px-4 font-bold text-white disabled:opacity-60"
            >
              {t("ui.bid")}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t p-4 text-center text-sm text-muted-foreground">
          {listing.isOwner ? t("ui.waiting_for_bids") : t("ui.this_auction_has_ended")}
        </p>
      )}
    </div>
  );
}
