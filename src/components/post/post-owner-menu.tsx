"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pin, PinOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pinPostToProfile, unpinPostFromProfile } from "@/actions/post-pin";
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
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (showOnlyForOwner && !isOwner) return null;

  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnSize = size === "md" ? "h-9 w-9" : "h-8 w-8";

  async function togglePin() {
    if (busy) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen} modal>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="게시물 메뉴"
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
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            disabled={busy}
            onSelect={(e) => {
              e.preventDefault();
              void togglePin();
            }}
          >
            {pinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                프로필 고정 해제
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                프로필에 고정
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="absolute top-full right-0 mt-1 text-[10px] text-destructive whitespace-nowrap">{error}</p>}
    </div>
  );
}
