"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export type PickedGif = { playUrl: string; previewUrl: string };

type Item = { id: string; previewUrl: string; playUrl: string };

export function TenorGifPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (gif: PickedGif) => void;
}) {
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void load(q);
    }, q.trim() ? 250 : 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function load(query: string) {
    setLoading(true);
    setError("");
    try {
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const res = await fetch(`/api/tenor/search${qs}`, { credentials: "include" });
      const body = (await res.json().catch(() => ({}))) as { items?: Item[]; error?: string };
      if (!res.ok) {
        setItems([]);
        setError(typeof body.error === "string" ? body.error : t("comments.gifUnavailable"));
        return;
      }
      setItems(body.items ?? []);
    } catch {
      setItems([]);
      setError(t("comments.gifUnavailable"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 animate-in fade-in-0 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("comments.searchGif")}
    >
      <div
        className="flex h-[min(72vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("comments.gifSearch")}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label={t("comments.closeMedia")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{error}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("comments.gifEmpty")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg bg-muted",
                    "transition-transform active:scale-[0.98]",
                  )}
                  onClick={() => {
                    onPick({ playUrl: item.playUrl, previewUrl: item.previewUrl });
                    onClose();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="border-t border-border px-3 py-2 text-right text-[10px] text-muted-foreground">
          {t("comments.gifPowered")}
        </p>
      </div>
    </div>
  );
}
