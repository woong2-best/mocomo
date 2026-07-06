"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteOwnPost } from "@/actions/post-delete";
import { pinPostToProfile, unpinPostFromProfile } from "@/actions/post-pin";
import { useLocale } from "@/components/providers/locale-provider";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  isPinned?: boolean;
  showOnlyForOwner?: boolean;
  isOwner?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function PostOwnerMenu({
  postId,
  isPinned = false,
  showOnlyForOwner = true,
  isOwner = false,
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [busy, setBusy] = useState<"pin" | "delete" | null>(null);
  const [error, setError] = useState("");

  if (showOnlyForOwner && !isOwner) return null;

  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnSize = size === "md" ? "h-9 w-9" : "h-8 w-8";

  async function togglePin() {
    if (busy) return;
    setBusy("pin");
    setError("");
    try {
      const res = pinned ? await unpinPostFromProfile(postId) : await pinPostToProfile(postId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setPinned(!pinned);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (busy) return;
    if (!window.confirm(t("post.menu.deleteConfirm"))) return;

    setBusy("delete");
    setError("");
    try {
      const res = await deleteOwnPost(postId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (pathname?.startsWith("/post/")) {
        router.push(COMMUNITY_FEED_PATH);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen} modal>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("post.menu.ariaLabel")}
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
              btnSize
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className={iconSize} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          {isOwner && (
            <>
              <DropdownMenuItem
                disabled={busy !== null}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("post.menu.delete")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {isOwner && (
            <DropdownMenuItem
              disabled={busy !== null}
              onSelect={(e) => {
                e.preventDefault();
                void togglePin();
              }}
            >
              {pinned ? (
                <>
                  <PinOff className="h-4 w-4" />
                  {t("post.menu.unpinFromProfile")}
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4" />
                  {t("post.menu.pinToProfile")}
                </>
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="absolute top-full right-0 mt-1 text-[10px] text-destructive whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}
