"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Flag, Pin, Share2, Trash2, VolumeX } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export type CommentContextMenuHandlers = {
  handlePin?: () => void;
  handleShare?: () => void;
  handleQuite?: () => void;
  handleReport?: () => void;
  handleBlock?: () => void;
  handleDelete?: () => void;
};

type ItemId = "pin" | "share" | "quite" | "report" | "block" | "delete";

type Props = CommentContextMenuHandlers & {
  open: boolean;
  onClose: () => void;
  anchor?: { top: number; left: number; width: number; height: number } | null;
};

const BACKDROP = { duration: 0.2, ease: "easeOut" as const };
const MENU = { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const };

export function CommentContextMenu({
  open,
  onClose,
  anchor,
  handlePin,
  handleShare,
  handleQuite,
  handleReport,
  handleBlock,
  handleDelete,
}: Props) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const run = (fn?: () => void) => {
    fn?.();
    onClose();
  };

  const items: {
    id: ItemId;
    label: string;
    icon: typeof Pin;
    destructive?: boolean;
    onSelect: () => void;
  }[] = [
    { id: "pin", label: t("comments.pin"), icon: Pin, onSelect: () => run(handlePin) },
    { id: "share", label: t("ui.share"), icon: Share2, onSelect: () => run(handleShare) },
    { id: "quite", label: t("post.menu.mute"), icon: VolumeX, onSelect: () => run(handleQuite) },
    {
      id: "report",
      label: t("post.menu.report"),
      icon: Flag,
      destructive: true,
      onSelect: () => run(handleReport),
    },
    { id: "block", label: t("post.menu.block"), icon: Ban, onSelect: () => run(handleBlock) },
    {
      id: "delete",
      label: t("post.menu.delete"),
      icon: Trash2,
      destructive: true,
      onSelect: () => run(handleDelete),
    },
  ];

  const pos = menuPosition(anchor);

  const node = (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[400]" role="presentation">
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP}
            onClick={onClose}
          />
          <motion.div
            role="menu"
            aria-label={t("ui.comment_menu")}
            className="absolute w-[min(16.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-[#262626] py-1 shadow-2xl"
            style={{ top: pos.top, left: pos.left, transformOrigin: pos.origin }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={MENU}
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium transition-colors",
                    "hover:bg-white/10 active:bg-white/[0.14]",
                    item.destructive ? "text-red-500" : "text-white"
                  )}
                  onClick={item.onSelect}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}

function menuPosition(anchor?: { top: number; left: number; width: number; height: number } | null) {
  const width = 264;
  const height = 6 * 48 + 8;
  if (typeof window === "undefined") {
    return { top: 24, left: 24, origin: "center" as const };
  }
  if (!anchor) {
    return {
      top: Math.max(12, (window.innerHeight - height) / 2),
      left: Math.max(12, (window.innerWidth - width) / 2),
      origin: "center" as const,
    };
  }
  const left = Math.min(
    Math.max(12, anchor.left + anchor.width - width),
    window.innerWidth - width - 12
  );
  const below = anchor.top + anchor.height + 8;
  const fitsBelow = below + height < window.innerHeight - 12;
  const top = fitsBelow ? below : Math.max(12, anchor.top - height - 8);
  return { top, left, origin: fitsBelow ? "top right" : "bottom right" };
}
