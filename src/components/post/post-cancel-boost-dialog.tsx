"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/providers/locale-provider";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import { errorText } from "@/lib/i18n/error-text";
import { formatMocoCount } from "@/lib/moco/decimal-amount";

type RefundQuote = {
  usedDays: number;
  unusedDays: number;
  refundMoco: number;
  totalDays: number;
};

type BoostStatusBody = {
  refund?: RefundQuote | null;
  complimentaryEligible?: boolean;
  campaign?: { mocoPaid?: number } | null;
};

export function PostCancelBoostDialog({
  open,
  onOpenChange,
  postId,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onCancelled?: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = usePublishedToastOptional();
  const [refund, setRefund] = useState<RefundQuote | null>(null);
  const [complimentary, setComplimentary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setComplimentary(false);
    setLoading(true);
    void fetch(`/api/ads/boost?postId=${encodeURIComponent(postId)}`, { credentials: "same-origin" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || t("post.boost.loadFailed"));
        const status = body as BoostStatusBody;
        setRefund(status.refund ?? null);
        setComplimentary(
          Boolean(status.complimentaryEligible) ||
            (status.campaign != null && Number(status.campaign.mocoPaid ?? 0) === 0)
        );
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("post.boost.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [open, postId, t]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ads/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ postId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(errorText(body.error) || t("post.boost.loadFailed"));
        return;
      }
      toast?.showInfoToast({ message: t("post.boost.cancelSuccess") });
      onOpenChange(false);
      onCancelled?.();
      router.refresh();
    } catch {
      setError(t("post.boost.loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const body =
    complimentary
      ? t("post.boost.cancelComplimentary")
      : refund && refund.refundMoco > 0
        ? t("post.boost.cancelBody", {
            used: refund.usedDays,
            total: refund.totalDays,
            refund: formatMocoCount(refund.refundMoco),
          })
        : t("post.boost.cancelNoRefund");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("post.boost.cancelTitle")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {loading ? t("post.loadingComments") : body}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void submit()}
          className="inline-flex w-full items-center justify-center rounded-full bg-destructive px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy
            ? t("post.boost.cancelBusy")
            : complimentary
              ? t("post.boost.cancelSubmitComplimentary")
              : t("post.boost.cancelSubmit")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
