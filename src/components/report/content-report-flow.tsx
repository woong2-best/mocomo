"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Flag, X } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import { submitContentReport } from "@/actions/report";
import {
  formatReportPathLabel,
  POST_REPORT_DISCLAIMER,
  POST_REPORT_REVIEW_HINT,
  POST_REPORT_ROOT_QUESTION,
  POST_REPORT_TAXONOMY,
  type ReportPathStep,
  type ReportReasonId,
  type ReportTaxonomyNode,
} from "@/lib/report-reasons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase = "browse" | "review" | "done";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string;
  postId?: string;
  commentId?: string;
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
  onSubmitted,
  trigger,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("browse");
  const [stack, setStack] = useState<ReportTaxonomyNode[][]>([]);
  const [path, setPath] = useState<ReportPathStep[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const currentNodes = stack.length > 0 ? stack[stack.length - 1]! : POST_REPORT_TAXONOMY;
  const currentQuestion =
    path.length > 0
      ? path[path.length - 1]!.node.childQuestion ?? POST_REPORT_ROOT_QUESTION
      : POST_REPORT_ROOT_QUESTION;

  const reviewSteps = useMemo(() => path, [path]);

  function reset() {
    setPhase("browse");
    setStack([]);
    setPath([]);
    setError("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function selectNode(node: ReportTaxonomyNode) {
    const question =
      path.length === 0
        ? POST_REPORT_ROOT_QUESTION
        : path[path.length - 1]!.node.childQuestion ?? POST_REPORT_ROOT_QUESTION;
    const nextPath = [...path, { question, node }];
    setPath(nextPath);

    if (node.children && node.children.length > 0) {
      setStack([...stack, node.children]);
      return;
    }
    setPhase("review");
  }

  function goBack() {
    if (phase === "review") {
      setPhase("browse");
      if (path.length > 0) {
        const nextPath = path.slice(0, -1);
        setPath(nextPath);
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : []));
      }
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
    let nodes = POST_REPORT_TAXONOMY;
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
      setError("신고 사유를 선택해 주세요.");
      return;
    }
    setError("");
    const reasonId = leaf.node.reasonId as ReportReasonId;
    const reasonPath = formatReportPathLabel(path);

    startTransition(async () => {
      const res = await submitContentReport({
        targetType,
        targetId,
        reason: reasonId,
        reasonPath,
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
          aria-label="신고하기"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="닫기"
            onClick={() => handleOpenChange(false)}
          />
          <div
            className={cn(
              "relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#1c1c1e] text-white shadow-2xl sm:rounded-2xl",
              "max-h-[min(92vh,40rem)]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />

            <div className="relative flex items-center justify-center px-12 py-3">
              {phase !== "done" ? (
                <button
                  type="button"
                  className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  aria-label="뒤로"
                  onClick={goBack}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  aria-label="닫기"
                  onClick={() => handleOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-[15px] font-semibold tracking-tight">
                {phase === "done" ? "완료" : "신고하기"}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {phase === "browse" ? (
                <>
                  <p className="mb-4 text-xl font-bold leading-snug">{currentQuestion}</p>
                  {path.length === 0 ? (
                    <p className="mb-5 text-sm leading-relaxed text-white/55">
                      {POST_REPORT_DISCLAIMER}
                    </p>
                  ) : null}
                  <ul className="divide-y divide-white/10">
                    {currentNodes.map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[15px] font-medium transition-colors hover:bg-white/5"
                          onClick={() => selectNode(node)}
                        >
                          <span>{node.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {phase === "review" ? (
                <>
                  <p className="mb-2 text-2xl font-bold">신고를 제출합니다</p>
                  <p className="mb-6 text-sm leading-relaxed text-sky-300/90">
                    {POST_REPORT_REVIEW_HINT}
                  </p>
                  <h3 className="mb-3 text-base font-bold">신고 상세 정보</h3>
                  <div className="space-y-4">
                    {reviewSteps.map((step, i) => (
                      <button
                        key={`${step.node.id}-${i}`}
                        type="button"
                        className="block w-full rounded-lg text-left transition-colors hover:bg-white/5"
                        onClick={() => jumpToStep(i)}
                      >
                        <p className="text-sm font-semibold text-white">{step.question}</p>
                        <p className="mt-0.5 text-sm text-white/50">{step.node.label}</p>
                      </button>
                    ))}
                  </div>
                  {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
                </>
              ) : null}

              {phase === "done" ? (
                <>
                  <p className="mb-3 text-2xl font-bold">소중한 의견 감사합니다</p>
                  <p className="text-sm leading-relaxed text-white/60">
                    회원님의 신고는 콘텐츠 검토에 반영되며, 비슷한 게시물이 덜 보일 수 있습니다.
                  </p>
                </>
              ) : null}
            </div>

            {phase === "review" ? (
              <div className="shrink-0 border-t border-white/10 px-5 py-4">
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[#0A84FF] text-base font-semibold text-white hover:bg-[#0A84FF]/90"
                  disabled={pending}
                  onClick={submit}
                >
                  {pending ? "제출 중…" : "제출"}
                </Button>
              </div>
            ) : null}

            {phase === "done" ? (
              <div className="shrink-0 border-t border-white/10 px-5 py-4">
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[#0A84FF] text-base font-semibold text-white hover:bg-[#0A84FF]/90"
                  onClick={() => handleOpenChange(false)}
                >
                  완료
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
