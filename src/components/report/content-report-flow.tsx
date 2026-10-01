"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Flag, X } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import { submitContentReport } from "@/actions/report";
import { submitChatRoomReportAction } from "@/actions/report-chat";
import {
  formatReportPathLabel,
  getPostReportCopy,
  POST_REPORT_OTHER_DETAILS_MIN,
  type ReportPathStep,
  type ReportReasonId,
  type ReportTaxonomyNode,
} from "@/lib/report-reasons";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Phase = "browse" | "details" | "review" | "done";

function ReportCategoryGrip({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex shrink-0 flex-col justify-center gap-[3px]", className)}
      aria-hidden
    >
      <span className="h-0.5 w-4 rounded-full bg-current opacity-40" />
      <span className="h-0.5 w-4 rounded-full bg-current opacity-40" />
      <span className="h-0.5 w-4 rounded-full bg-current opacity-40" />
    </span>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string;
  postId?: string;
  commentId?: string;
  /** When set, submits a chat-room report (freezes room) instead of a generic content report. */
  chatRoomId?: string;
  productId?: string;
  /** Called after a successful submit (before the thank-you auto-close). */
  onSubmitted?: () => void | Promise<void>;
  /** Icon-only rail trigger when used as controlled+triggerless from parent */
  trigger?: React.ReactNode;
};

export function ContentReportFlow({
  open,
  onOpenChange,
  targetType,
  targetId,
  reportedUserId,
  postId,
  commentId,
  chatRoomId,
  productId,
  onSubmitted,
  trigger,
}: Props) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const reportCopy = useMemo(
    () => getPostReportCopy(locale, chatRoomId ? "chat" : "post"),
    [locale, chatRoomId]
  );
  const [phase, setPhase] = useState<Phase>("browse");
  const [stack, setStack] = useState<ReportTaxonomyNode[][]>([]);
  const [path, setPath] = useState<ReportPathStep[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [details, setDetails] = useState("");

  const sheetTitle =
    phase === "done"
      ? t("common.done")
      : chatRoomId
        ? uiText(locale, "채팅 신고", "Report chat")
        : t("report.title");

  const currentNodes = stack.length > 0 ? stack[stack.length - 1]! : reportCopy.taxonomy;
  const currentQuestion =
    path.length > 0
      ? path[path.length - 1]!.node.childQuestion ?? reportCopy.rootQuestion
      : reportCopy.rootQuestion;

  const reviewSteps = useMemo(() => path, [path]);

  function reset() {
    setPhase("browse");
    setStack([]);
    setPath([]);
    setError("");
    setDetails("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function selectNode(node: ReportTaxonomyNode) {
    const question =
      path.length === 0
        ? reportCopy.rootQuestion
        : path[path.length - 1]!.node.childQuestion ?? reportCopy.rootQuestion;
    const nextPath = [...path, { question, node }];
    setPath(nextPath);

    if (node.children && node.children.length > 0) {
      setStack([...stack, node.children]);
      return;
    }
    if (node.requiresDetails) {
      setPhase("details");
      return;
    }
    setPhase("review");
  }

  function goBack() {
    if (phase === "details") {
      setPhase("browse");
      setPath((prev) => prev.slice(0, -1));
      setDetails("");
      setError("");
      return;
    }
    if (phase === "review") {
      const leaf = path[path.length - 1]?.node;
      if (leaf?.requiresDetails) {
        setPhase("details");
        setError("");
        return;
      }
      setPhase("browse");
      const nextPath = path.slice(0, -1);
      setPath(nextPath);
      const nextStack: ReportTaxonomyNode[][] = [];
      for (let i = 0; i < nextPath.length; i++) {
        const selected = nextPath[i]!.node;
        if (selected.children) nextStack.push(selected.children);
      }
      setStack(nextStack);
      return;
    }
    if (stack.length === 0) {
      handleOpenChange(false);
      return;
    }
    setStack((prev) => prev.slice(0, -1));
    setPath((prev) => prev.slice(0, -1));
  }

  function jumpToStep(index: number) {
    setPhase("browse");
    setPath(path.slice(0, index));
    // Rebuild stack from path so user can re-pick from that level
    const nextStack: ReportTaxonomyNode[][] = [];
    let nodes = reportCopy.taxonomy;
    for (let i = 0; i < index; i++) {
      const selected = path[i]!.node;
      if (selected.children) {
        nextStack.push(selected.children);
        nodes = selected.children;
      }
    }
    void nodes;
    setStack(nextStack);
  }

  function submit() {
    const leaf = path[path.length - 1];
    if (!leaf?.node.reasonId) {
      setError(t("report.selectReason"));
      return;
    }
    setError("");
    const reasonId = leaf.node.reasonId as ReportReasonId;
    const reasonPath = formatReportPathLabel(path);
    const trimmedDetails = details.trim();
    if (leaf.node.requiresDetails && trimmedDetails.length < POST_REPORT_OTHER_DETAILS_MIN) {
      setError(t("report.otherMinLength", { min: String(POST_REPORT_OTHER_DETAILS_MIN) }));
      if (phase !== "details") setPhase("details");
      return;
    }

    startTransition(async () => {
      const res = chatRoomId
        ? await submitChatRoomReportAction({
            roomId: chatRoomId,
            reason: reasonId,
            reasonPath,
            details: trimmedDetails || undefined,
            reportedUserId,
            productId,
          })
        : await submitContentReport({
            targetType,
            targetId,
            reason: reasonId,
            reasonPath,
            details: trimmedDetails || undefined,
            reportedUserId,
            postId,
            commentId,
          });
      if (res.error) {
        setError(res.error);
        return;
      }
      try {
        await onSubmitted?.();
      } catch {
        // report already saved — ignore follow-up failures
      }
      setPhase("done");
      setTimeout(() => {
        handleOpenChange(false);
        router.refresh();
      }, 1600);
    });
  }

  if (!open && !trigger) return null;

  return (
    <>
      {trigger ? (
        <button type="button" onClick={() => handleOpenChange(true)} className="contents">
          {trigger}
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("report.closeDialog")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={() => handleOpenChange(false)}
          />
          <div
            className={cn(
              "relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[1.35rem] border border-border bg-card text-card-foreground shadow-folk sm:rounded-[1.35rem]",
              "max-h-[min(92vh,40rem)]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-3 h-1 w-11 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" />

            <div className="relative flex items-center justify-center px-14 py-4">
              {phase !== "done" ? (
                <button
                  type="button"
                  className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-secondary active:bg-[hsl(var(--folk-cobalt))] active:text-[hsl(var(--folk-cream))]"
                  aria-label={t("common.back")}
                  onClick={goBack}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-secondary"
                  aria-label={t("common.close")}
                  onClick={() => handleOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {sheetTitle}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
              {phase === "browse" ? (
                <>
                  <p className="mb-3 text-xl font-bold leading-snug text-foreground">
                    {currentQuestion}
                  </p>
                  {path.length === 0 ? (
                    <p className="mb-6 rounded-xl bg-muted/80 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
                      {reportCopy.disclaimer}
                    </p>
                  ) : null}
                  <ul className="space-y-2">
                    {currentNodes.map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/60 px-4 py-3.5 text-left text-[15px] font-semibold text-foreground transition-colors hover:border-[hsl(var(--folk-cobalt))]/35 hover:bg-muted/50 active:border-[hsl(var(--folk-cobalt))] active:bg-[hsl(var(--folk-cobalt))]/10"
                          onClick={() => selectNode(node)}
                        >
                          <span className="leading-snug">{node.label}</span>
                          {node.children?.length ? (
                            <ReportCategoryGrip className="text-[hsl(var(--folk-cobalt))]" />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {phase === "details" ? (
                <>
                  <p className="mb-2 text-xl font-bold text-foreground">{reportCopy.otherDetailsPrompt}</p>
                  <p className="mb-4 text-sm text-muted-foreground">{t("report.detailsHelp")}</p>
                  <Textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={t("report.detailsPlaceholder")}
                    className="min-h-[120px] resize-none rounded-xl border-border bg-background text-[15px]"
                    maxLength={2000}
                  />
                  {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                </>
              ) : null}

              {phase === "review" ? (
                <>
                  <p className="mb-2 text-2xl font-bold text-foreground">{t("report.submitTitle")}</p>
                  <p className="mb-6 text-sm leading-relaxed text-[hsl(var(--folk-cobalt))]">
                    {reportCopy.reviewHint}
                  </p>
                  <h3 className="mb-3 text-base font-bold text-foreground">{t("report.detailsTitle")}</h3>
                  <div className="space-y-3">
                    {reviewSteps.map((step, i) => (
                      <button
                        key={`${step.node.id}-${i}`}
                        type="button"
                        className="block w-full rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-left transition-colors hover:border-[hsl(var(--folk-cobalt))]/40 active:bg-[hsl(var(--folk-cobalt))]/10"
                        onClick={() => jumpToStep(i)}
                      >
                        <p className="text-sm font-semibold text-foreground">{step.question}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{step.node.label}</p>
                      </button>
                    ))}
                  </div>
                  {details.trim() ? (
                    <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{t("report.extraDetails")}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {details.trim()}
                      </p>
                    </div>
                  ) : null}
                  {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
                </>
              ) : null}

              {phase === "done" ? (
                <>
                  <p className="mb-3 text-2xl font-bold text-foreground">{t("report.thankYou")}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t("report.thankYouBody")}</p>
                </>
              ) : null}
            </div>

            {phase === "details" ? (
              <div className="shrink-0 border-t border-border px-6 py-5">
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[hsl(var(--folk-cobalt))] text-base font-bold text-[hsl(var(--folk-cream))] hover:bg-[hsl(var(--folk-cobalt))]/90"
                  onClick={() => {
                    if (details.trim().length < POST_REPORT_OTHER_DETAILS_MIN) {
                      setError(t("report.otherMinLength", { min: String(POST_REPORT_OTHER_DETAILS_MIN) }));
                      return;
                    }
                    setError("");
                    setPhase("review");
                  }}
                >
                  {t("common.next")}
                </Button>
              </div>
            ) : null}

            {phase === "review" ? (
              <div className="shrink-0 border-t border-border px-6 py-5">
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[hsl(var(--folk-cobalt))] text-base font-bold text-[hsl(var(--folk-cream))] hover:bg-[hsl(var(--folk-cobalt))]/90"
                  disabled={pending}
                  onClick={submit}
                >
                  {pending ? t("report.submitting") : t("report.submit")}
                </Button>
              </div>
            ) : null}

            {phase === "done" ? (
              <div className="shrink-0 border-t border-border px-6 py-5">
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[hsl(var(--folk-cobalt))] text-base font-bold text-[hsl(var(--folk-cream))] hover:bg-[hsl(var(--folk-cobalt))]/90"
                  onClick={() => handleOpenChange(false)}
                >
                  {t("common.done")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Compact Flag control for reels / immersive rails */
export function ContentReportRailButton({
  targetType,
  targetId,
  reportedUserId,
  postId,
  commentId,
  className,
}: Omit<Props, "open" | "onOpenChange" | "trigger"> & { className?: string }) {
  const [open, setOpen] = useState(false);
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex flex-col items-center gap-0.5 min-h-11 min-w-11 text-white",
          className
        )}
        aria-label="신고"
        onClick={(e) => {
          e.stopPropagation();
          if (status === "loading") return;
          if (!session?.user) {
            router.push(
              `/auth/signin?callbackUrl=${encodeURIComponent(
                postId ? `/post/${postId}` : "/"
              )}`
            );
            return;
          }
          setOpen(true);
        }}
      >
        <Flag className="h-7 w-7 drop-shadow-md" />
      </button>
      <ContentReportFlow
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        reportedUserId={reportedUserId}
        postId={postId}
        commentId={commentId}
      />
    </>
  );
}
