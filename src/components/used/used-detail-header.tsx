"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Home, MoreHorizontal, Trash2 } from "lucide-react";
import { ShareGlobeIcon } from "@/components/ui/share-globe-icon";
import { deleteUsedListing } from "@/actions/used-market";

export function UsedDetailHeader({
  listingId,
  isSeller,
}: {
  listingId: string;
  isSeller: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function share() {
    const url = `${window.location.origin}/used/${listingId}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: document.title });
        return;
      } catch {
        /* fallback */
      }
    }
    await navigator.clipboard.writeText(url);
    setShareMsg("링크를 복사했습니다.");
    window.setTimeout(() => setShareMsg(""), 2000);
  }

  async function remove() {
    setDeleting(true);
    await deleteUsedListing(listingId);
    router.push("/used/my");
  }

  return (
    <div className="border-b border-border/60">
      {shareMsg && (
        <p className="px-4 py-1.5 text-xs text-center text-emerald-600 bg-emerald-500/10">{shareMsg}</p>
      )}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-1">
          <Link href="/used" className="p-2 -ml-1 rounded-lg hover:bg-muted" aria-label="뒤로">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Link href="/used" className="p-2 rounded-lg hover:bg-muted" aria-label="중고거래 홈">
            <Home className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void share()} className="p-2 rounded-lg hover:bg-muted" aria-label="공유">
            <ShareGlobeIcon className="h-5 w-5" />
          </button>
          {isSeller && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((o) => !o);
                  setConfirmDelete(false);
                }}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label="더보기"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    aria-label="닫기"
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
                        글 삭제
                      </button>
                    ) : (
                      <div className="px-3 py-2 space-y-2">
                        <p className="text-xs text-muted-foreground">삭제할까요?</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex-1 rounded-lg border py-1.5 text-xs"
                            onClick={() => setConfirmDelete(false)}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            disabled={deleting}
                            className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-1.5 text-xs font-medium"
                            onClick={() => void remove()}
                          >
                            {deleting ? "…" : "삭제"}
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
