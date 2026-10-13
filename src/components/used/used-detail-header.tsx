"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowUpCircle,
  Ban,
  ChevronLeft,
  EyeOff,
  Flag,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import {
  bumpUsedListing,
  deleteUsedListing,
  hideUsedListing,
} from "@/actions/used-market";
import { blockUserAction } from "@/actions/user-relationship";
import { UsedListingHeartButton } from "@/components/used/used-listing-heart-button";
import { UsedListingStarButton } from "@/components/used/used-listing-star-button";
import { ContentReportFlow } from "@/components/report/content-report-flow";
import { useLocale } from "@/components/providers/locale-provider";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import { errorText } from "@/lib/i18n/error-text";

export function UsedDetailHeader({
  listingId,
  listingTitle,
  isSeller,
  sellerId,
  sellerUsername,
  saleType,
  sellerHidden = false,
  initialFavorited = false,
  initialStarred = false,
  heading,
}: {
  listingId: string;
  listingTitle: string;
  isSeller: boolean;
  sellerId: string;
  sellerUsername: string;
  saleType?: string;
  sellerHidden?: boolean;
  initialFavorited?: boolean;
  initialStarred?: boolean;
  heading?: string;
}) {
  const { t } = useLocale();
  const resolvedHeading = heading ?? t("ui.listing");
  const router = useRouter();
  const session = useSession();
  const publishedToast = usePublishedToastOptional();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "block" | "hide" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const loggedIn = !!session?.data?.user;

  function closeMenu() {
    setMenuOpen(false);
    setConfirm(null);
  }

  async function share() {
    const url = `${window.location.origin}/market/${listingId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listingTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        publishedToast?.showInfoToast({ message: t("ui.link_copied") });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        publishedToast?.showInfoToast({ message: t("ui.link_copied") });
      } catch {
        publishedToast?.showErrorToast({ message: t("ui.could_not_share") });
      }
    }
    closeMenu();
  }

  function requireLogin() {
    if (loggedIn) return true;
    closeMenu();
    router.push(`/auth/signin?callbackUrl=/market/${listingId}`);
    return false;
  }

  async function bump() {
    if (busy) return;
    setBusy("bump");
    try {
      const res = await bumpUsedListing(listingId);
      if ("error" in res && res.error) {
        publishedToast?.showErrorToast({ message: errorText(res.error) });
        return;
      }
      publishedToast?.showInfoToast({ message: t("ui.listing_bumped") });
      closeMenu();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function hide() {
    if (busy) return;
    setBusy("hide");
    try {
      const res = await hideUsedListing(listingId, !sellerHidden);
      if ("error" in res && res.error) {
        publishedToast?.showErrorToast({ message: errorText(res.error) });
        return;
      }
      publishedToast?.showInfoToast({
        message: sellerHidden ? t("ui.listing_unhidden") : t("ui.listing_hidden"),
      });
      closeMenu();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy("delete");
    try {
      const res = await deleteUsedListing(listingId);
      if (res && "error" in res && res.error) {
        publishedToast?.showErrorToast({ message: errorText(res.error) });
        return;
      }
      closeMenu();
      router.push("/market/my");
    } finally {
      setBusy(null);
    }
  }

  async function block() {
    if (busy || !sellerId) return;
    setBusy("block");
    try {
      const res = await blockUserAction(sellerId, sellerUsername);
      if (res.error) {
        publishedToast?.showErrorToast({ message: errorText(res.error) });
        return;
      }
      publishedToast?.showInfoToast({ message: t("post.menu.blockDone") });
      closeMenu();
      router.push("/market");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-b border-border/60 bg-card">
      <div className="flex items-center gap-2 px-2 py-2">
        <Link
          href="/market"
          className="p-2 -ml-1 rounded-lg hover:bg-muted"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-xl font-extrabold">{resolvedHeading}</p>
        <div className="flex items-center">
          <UsedListingStarButton listingId={listingId} initialStarred={initialStarred} />
          {!isSeller ? (
            <UsedListingHeartButton listingId={listingId} initialFavorited={initialFavorited} />
          ) : null}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((o) => !o);
                setConfirm(null);
              }}
              className="p-2 rounded-lg hover:bg-muted"
              aria-label={t("nav.more")}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label={t("common.close")}
                  onClick={closeMenu}
                />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border bg-card shadow-lg py-1">
                  {confirm === "delete" ? (
                    <div className="px-3 py-2 space-y-2">
                      <p className="text-xs text-muted-foreground">{t("ui.delete_this_listing")}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg border py-1.5 text-xs"
                          onClick={() => setConfirm(null)}
                        >
                          {t("calendar.cancel")}
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-1.5 text-xs font-medium"
                          onClick={() => void remove()}
                        >
                          {busy === "delete" ? "…" : t("post.menu.delete")}
                        </button>
                      </div>
                    </div>
                  ) : confirm === "block" ? (
                    <div className="px-3 py-2 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("ui.block_this_user", { username: sellerUsername })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg border py-1.5 text-xs"
                          onClick={() => setConfirm(null)}
                        >
                          {t("calendar.cancel")}
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-1.5 text-xs font-medium"
                          onClick={() => void block()}
                        >
                          {busy === "block" ? "…" : t("post.menu.block")}
                        </button>
                      </div>
                    </div>
                  ) : confirm === "hide" ? (
                    <div className="px-3 py-2 space-y-2">
                      <p className="text-xs text-muted-foreground">{t("ui.hide_this_listing")}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg border py-1.5 text-xs"
                          onClick={() => setConfirm(null)}
                        >
                          {t("calendar.cancel")}
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          className="flex-1 rounded-lg border py-1.5 text-xs font-medium"
                          onClick={() => void hide()}
                        >
                          {busy === "hide" ? "…" : t("ui.hide")}
                        </button>
                      </div>
                    </div>
                  ) : isSeller ? (
                    <>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          closeMenu();
                          router.push(`/market/${listingId}/edit`);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("ui.edit_listing")}
                      </button>
                      {saleType !== "AUCTION" && !sellerHidden ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => void bump()}
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                          {t("ui.up")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={!!busy}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          if (sellerHidden) void hide();
                          else setConfirm("hide");
                        }}
                      >
                        <EyeOff className="h-4 w-4" />
                        {sellerHidden ? t("ui.unhide") : t("ui.hide")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm("delete")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("post.menu.delete")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => void share()}
                      >
                        <Share2 className="h-4 w-4" />
                        {t("ui.share")}
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                        onClick={() => {
                          if (!requireLogin()) return;
                          setConfirm("block");
                        }}
                      >
                        <Ban className="h-4 w-4" />
                        {t("ui.block_user")}
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          if (!requireLogin()) return;
                          setMenuOpen(false);
                          setReportOpen(true);
                        }}
                      >
                        <Flag className="h-4 w-4" />
                        {t("post.menu.report")}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {isSeller && sellerHidden ? (
        <p className="px-4 pb-2 text-xs font-semibold text-muted-foreground">{t("ui.listing_is_hidden")}</p>
      ) : null}
      <ContentReportFlow
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="USED_LISTING"
        targetId={listingId}
        reportedUserId={sellerId}
      />
    </div>
  );
}
