"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Link2, MoreHorizontal, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { listRecentDmPartners, shareContentViaDm } from "@/actions/share-via-dm";
import { displayableImageUrl } from "@/lib/displayable-image-url";
import type { DmUserSearchHit } from "@/lib/dm-user-search";
import {
  copyShareLink,
  shareToInstagram,
  shareToSms,
  shareToWhatsApp,
  shareWithOs,
} from "@/lib/share/mobile-share-actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  shareMessage: string;
  postId?: string;
  onActionError?: (message: string) => void;
  onCopied?: () => void;
  onSharedDm?: (roomId: string) => void;
};

const HOSTS = new Set(["zelie", "cleo", "mio", "nangnang"]);
const CLOSE_PX = 110;

export function MobileShareSheet({
  open,
  onOpenChange,
  url,
  shareMessage,
  postId,
  onActionError,
  onCopied,
  onSharedDm,
}: Props) {
  const router = useRouter();
  const session = useSession();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<DmUserSearchHit[]>([]);
  const [results, setResults] = useState<DmUserSearchHit[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef({ startY: 0, lastY: 0, dragging: false });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentPending, startRecent] = useTransition();
  const [searchPending, startSearch] = useTransition();

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSendingId(null);
    setDragY(0);
    setClosing(false);
    setEntered(false);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => setEntered(true));
    startRecent(async () => {
      try {
        setRecent(await listRecentDmPartners());
      } catch {
        setRecent([]);
      }
    });
    return () => {
      document.body.style.overflow = prev;
      cancelAnimationFrame(id);
    };
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim().replace(/^@+/, "");
      if (q.length < 1) {
        setResults([]);
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      startSearch(async () => {
        try {
          const res = await fetch(`/api/messages/user-search?q=${encodeURIComponent(q)}`, {
            signal: ac.signal,
          });
          const body = (await res.json()) as { ok?: boolean; users?: DmUserSearchHit[] };
          if (!res.ok || !body.ok || ac.signal.aborted) return;
          setResults(Array.isArray(body.users) ? body.users : []);
        } catch {
          if (!ac.signal.aborted) setResults([]);
        }
      });
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query]);

  const close = useCallback(() => {
    setClosing(true);
    setEntered(false);
    window.setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 220);
  }, [onOpenChange, reset]);

  const people = pinHosts(query.trim() ? results : recent);

  async function sendTo(user: DmUserSearchHit) {
    if (sendingId) return;
    if (session.status !== "authenticated") {
      close();
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`);
      return;
    }
    setSendingId(user.id);
    try {
      const result = await shareContentViaDm({
        recipientIds: [user.id],
        postId,
        shareMessage,
      });
      if (!result.ok) {
        onActionError?.(t(result.error));
        return;
      }
      onSharedDm?.(result.roomId);
      close();
    } catch {
      onActionError?.(t("share.could_not_send"));
    } finally {
      setSendingId(null);
    }
  }

  async function runOutside(kind: "copy" | "instagram" | "whatsapp" | "sms" | "more") {
    try {
      if (kind === "copy") {
        await copyShareLink(url);
        onCopied?.();
        close();
        return;
      }
      if (kind === "whatsapp") {
        await shareToWhatsApp(url);
        close();
        return;
      }
      if (kind === "sms") {
        await shareToSms(url);
        close();
        return;
      }
      if (kind === "instagram") {
        await shareToInstagram(url);
        close();
        return;
      }
      await shareWithOs({ url, text: shareMessage });
      close();
    } catch (e) {
      if (kind === "more" || kind === "instagram") {
        try {
          await copyShareLink(url);
          onCopied?.();
          close();
          return;
        } catch {
          onActionError?.(t("share.srsq7vp"));
          return;
        }
      }
      onActionError?.(e instanceof Error ? e.message : t("share.srsq7vp"));
    }
  }

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, lastY: e.clientY, dragging: true };
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.dragging) return;
    const next = Math.max(0, e.clientY - dragRef.current.startY);
    dragRef.current.lastY = e.clientY;
    setDragY(next);
  }

  function onHandlePointerUp() {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (dragY > CLOSE_PX) {
      close();
      return;
    }
    setDragY(0);
  }

  if (!mounted || (!open && !closing)) return null;

  const sheetShift = closing ? 420 : entered ? dragY : 420;
  const dim = closing || !entered ? 0 : Math.max(0, 1 - dragY / 420);

  return createPortal(
    <div
      className="lg:hidden fixed inset-0 z-[420]"
      role="dialog"
      aria-modal="true"
      aria-label={t("share.to_title")}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black transition-opacity duration-200"
        style={{ opacity: dim * 0.58 }}
        aria-label={t("common.close")}
        onClick={close}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#1C1C1E] pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-white will-change-transform"
        style={{
          transform: `translate3d(0, ${sheetShift}px, 0)`,
          transition: dragRef.current.dragging ? "none" : "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="flex cursor-grab touch-none justify-center py-2 active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <span className="h-1.5 w-9 rounded-full bg-white/25" />
        </div>

        <h2 className="px-5 pb-3.5 text-[28px] font-extrabold tracking-tight">{t("share.to_title")}</h2>

        <label className="mx-4 mb-4 flex min-h-10 items-center gap-2 rounded-xl bg-[#2C2C2E] px-3">
          <Search className="h-4 w-4 shrink-0 text-[#636366]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("share.search_friends")}
            className="h-10 w-full bg-transparent text-[16px] text-white outline-none placeholder:text-[#636366]"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="text-[#636366]" aria-label="Clear">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="min-h-[88px]">
          {recentPending && people.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[#8E8E93]">{t("share.sy2j7up")}</p>
          ) : people.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[#8E8E93]">
              {searchPending ? t("share.sy2j7up") : t("share.no_people")}
            </p>
          ) : (
            <div className="flex gap-3.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {people.map((user) => {
                const label = user.name?.trim() || user.username;
                const src = displayableImageUrl(user.image);
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={!!sendingId}
                    onClick={() => void sendTo(user)}
                    className="flex w-[72px] shrink-0 flex-col items-center gap-2"
                  >
                    <span className="relative h-16 w-16 overflow-hidden rounded-full bg-[#3A3A3A]">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg font-extrabold">
                          {label.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {sendingId === user.id ? (
                        <span className="absolute inset-0 bg-black/45" />
                      ) : null}
                    </span>
                    <span className="w-full truncate text-center text-[12px] font-medium text-[#EBEBF5]">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="px-5 pb-3 pt-1.5 text-[12px] font-bold tracking-[0.08em] text-[#8E8E93]">
          {t("share.outside")}
        </p>
        <div className="flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <OutsideButton label={t("share.sj7ztt0")} onClick={() => void runOutside("copy")}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3A3A3C]">
              <Link2 className="h-5 w-5" />
            </span>
          </OutsideButton>
          <OutsideButton label={t("share.instagram")} onClick={() => void runOutside("instagram")}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)]">
              <InstagramGlyph />
            </span>
          </OutsideButton>
          <OutsideButton label={t("share.whatsapp")} onClick={() => void runOutside("whatsapp")}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-[22px] font-bold">
              <WhatsAppGlyph />
            </span>
          </OutsideButton>
          <OutsideButton label={t("share.sms")} onClick={() => void runOutside("sms")}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A84FF]">
              <SmsGlyph />
            </span>
          </OutsideButton>
          <OutsideButton label={t("share.more")} onClick={() => void runOutside("more")}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3A3A3C]">
              <MoreHorizontal className="h-5 w-5" />
            </span>
          </OutsideButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

function pinHosts(list: DmUserSearchHit[]) {
  const hosts: DmUserSearchHit[] = [];
  const rest: DmUserSearchHit[] = [];
  for (const row of list) {
    if (HOSTS.has(row.username.toLowerCase())) hosts.push(row);
    else rest.push(row);
  }
  hosts.sort((a, b) => a.username.localeCompare(b.username));
  return [...hosts, ...rest];
}

function OutsideButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[72px] shrink-0 flex-col items-center gap-2 text-[#EBEBF5]"
    >
      {children}
      <span className="w-full truncate text-center text-[11px] font-medium">{label}</span>
    </button>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-white" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="white" stroke="none" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.86 9.86 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C22 6.45 17.5 2 12.04 2zm5.79 14.17c-.24.68-1.42 1.3-1.97 1.38-.5.08-1.14.11-1.84-.12-.42-.13-.97-.32-1.67-.62-2.94-1.27-4.86-4.23-5.01-4.43-.15-.2-1.22-1.62-1.22-3.1 0-1.47.77-2.2 1.04-2.5.26-.29.58-.37.77-.37.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.82 2.04.89 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.77 1.27 1.65 2.06 1.14 1.01 2.1 1.32 2.39 1.47.3.15.47.13.64-.08.18-.2.74-.86.94-1.16.2-.29.39-.24.66-.15.26.1 1.67.79 1.96.93.29.15.48.22.55.34.07.12.07.71-.17 1.39z" />
    </svg>
  );
}

function SmsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
      <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
    </svg>
  );
}
