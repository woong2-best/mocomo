"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { submitAccountAppeal } from "@/actions/appeal";
import { accountStatusLabel } from "@/lib/account-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AccountStatus } from "@prisma/client";

type AppealContextUser = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  accountStatus: AccountStatus;
  suspensionReason: string | null;
  suspendedAt: Date | null;
};

export function AppealForm({
  user,
  openAppeal,
}: {
  user: AppealContextUser;
  openAppeal: { id: string; status: string; createdAt: Date; updatedAt: Date } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState(user.email ?? "");
  const [allowFollowUpEmail, setAllowFollowUpEmail] = useState(true);
  const [ackTruth, setAckTruth] = useState(false);
  const [ackNotFalse, setAckNotFalse] = useState(false);
  const [ackNoRepeat, setAckNoRepeat] = useState(false);

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length >= 50 &&
    contactEmail.trim().length > 0 &&
    ackTruth &&
    ackNotFalse &&
    ackNoRepeat &&
    !pending;

  if (openAppeal) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">이의 제기 검토 중</h1>
        <p className="text-sm text-muted-foreground">
          현재 제출한 이의 제기가 검토 중입니다. 중복 제출은 불가능합니다.
        </p>
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-700">🟡 검토 중</p>
          <p className="mt-1 text-muted-foreground">
            접수일: {format(openAppeal.createdAt, "yyyy-MM-dd HH:mm", { locale: ko })}
          </p>
          <p className="text-muted-foreground">
            최근 수정일: {format(openAppeal.updatedAt, "yyyy-MM-dd HH:mm", { locale: ko })}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/appeal/${openAppeal.id}`}>접수 내역 보기</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="text-2xl font-bold">이의 제기가 접수되었습니다.</h1>
        <p className="text-sm text-muted-foreground">
          담당자가 내용을 검토한 후 이메일 또는 사이트 알림을 통해 결과를 안내해 드립니다.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/appeal/history">접수 내역 보기</Link>
          </Button>
          <Button asChild>
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Link>
        <h1 className="text-2xl font-bold">계정 정지 이의 제기</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          귀하의 계정이 운영원칙 위반으로 인해 제한되었습니다. 이번 이의 제기는 담당자가 직접 검토하며,
          허위 정보 제출 또는 반복적인 이의 제기는 기각될 수 있습니다. 검토에는 일반적으로 수 시간에서
          최대 7일 정도 소요될 수 있습니다.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-semibold">계정 정보</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">계정 ID</dt>
            <dd className="font-mono">{user.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">닉네임</dt>
            <dd>@{user.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">가입일</dt>
            <dd>{format(user.createdAt, "yyyy-MM-dd", { locale: ko })}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">정지 일시</dt>
            <dd>
              {user.suspendedAt
                ? format(user.suspendedAt, "yyyy-MM-dd HH:mm", { locale: ko })
                : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">정지 유형</dt>
            <dd>{accountStatusLabel(user.accountStatus)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">정지 사유</dt>
            <dd className="mt-1 whitespace-pre-wrap">{user.suspensionReason ?? "관리자 입력 사유 없음"}</dd>
          </div>
        </dl>
      </section>

      <form
        className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setError("");
          startTransition(async () => {
            const res = await submitAccountAppeal({
              title: title.trim(),
              content: content.trim(),
              contactEmail: contactEmail.trim(),
              allowFollowUpEmail,
            });
            if (res.error) {
              setError(res.error);
              return;
            }
            setDone(true);
            router.refresh();
          });
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="계정 정지가 잘못 적용되었습니다."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">상세 내용 (최소 50자)</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder="왜 해당 조치가 잘못되었다고 생각하는지 구체적으로 작성해 주세요."
          />
          <p className="text-xs text-muted-foreground">{content.trim().length} / 5000</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">연락 가능한 이메일</label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowFollowUpEmail}
            onChange={(e) => setAllowFollowUpEmail(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          추가 자료 요청 시 이메일 수신에 동의합니다.
        </label>

        <div className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ackTruth}
              onChange={(e) => setAckTruth(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            제출한 내용은 사실입니다.
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ackNotFalse}
              onChange={(e) => setAckNotFalse(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            허위 신고가 아닙니다.
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ackNoRepeat}
              onChange={(e) => setAckNoRepeat(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            동일한 사유로 반복 제출하지 않았습니다.
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href="/">취소</Link>
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                이의 제기를 제출하는 중...
              </>
            ) : (
              "이의 제기 제출"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
