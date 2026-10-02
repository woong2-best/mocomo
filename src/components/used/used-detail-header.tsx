"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteUsedListing } from "@/actions/used-market";
import { UsedListingHeartButton } from "@/components/used/used-listing-heart-button";
import { UsedListingStarButton } from "@/components/used/used-listing-star-button";
import { useLocale } from "@/components/providers/locale-provider";


export function UsedDetailHeader({
  listingId,
  isSeller,
  initialFavorited = false,
  initialStarred = false,
  heading,
}: {
  listingId: string;
  isSeller: boolean;
  initialFavorited?: boolean;
  initialStarred?: boolean;
  heading?: string;
}) {
  const { locale , t } = useLocale();
  const resolvedHeading = heading ?? t("ui.listing");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    await deleteUsedListing(listingId);
    router.push("/market/my");
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
          {isSeller && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((o) => !o);
                  setConfirmDelete(false);
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
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border bg-card shadow-lg py-1">
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("ui.delete_listing")}
                      </button>
                    ) : (
                      <div className="px-3 py-2 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t("ui.delete_this_listing")}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex-1 rounded-lg border py-1.5 text-xs"
                            onClick={() => setConfirmDelete(false)}
                          >
                            {t("calendar.cancel")}
                          </button>
                          <button
                            type="button"
                            disabled={deleting}
                            className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-1.5 text-xs font-medium"
                            onClick={() => void remove()}
                          >
                            {deleting ? "…" : t("post.menu.delete")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
