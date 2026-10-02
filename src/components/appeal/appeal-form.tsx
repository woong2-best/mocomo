"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
        <h1 className="text-2xl font-bold">{t("appeal.sajzc69")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("appeal.s1qm8z8o")}
        </p>
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-700">{t("appeal.sfqvotp")}</p>
          <p className="mt-1 text-muted-foreground">
            접수일: {format(openAppeal.createdAt, "yyyy-MM-dd HH:mm", { locale: ko })}
          </p>
          <p className="text-muted-foreground">
            최근 수정일: {format(openAppeal.updatedAt, "yyyy-MM-dd HH:mm", { locale: ko })}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/appeal/${openAppeal.id}`}>{t("appeal.s12cshmy")}</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="text-2xl font-bold">{t("appeal.s1lpnex0")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("appeal.s5q3w00")}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/appeal/history">{t("appeal.s12cshmy")}</Link>
          </Button>
          <Button asChild>
            <Link href="/">{t("events.swcstk")}</Link>
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
          {t("appeal.snk29go")}
        </Link>
        <h1 className="text-2xl font-bold">{t("appeal.s26g3l6")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("appeal.s1s7u4h4_2")}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-semibold">{t("appeal.s1phtmwe")}</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("appeal.s1pgum6i")}</dt>
            <dd className="font-mono">{user.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("settings.nickname")}</dt>
            <dd>@{user.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("appeal.sq5zfb")}</dt>
            <dd>{format(user.createdAt, "yyyy-MM-dd", { locale: ko })}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("appeal.sqg7d91")}</dt>
            <dd>
              {user.suspendedAt
                ? format(user.suspendedAt, "yyyy-MM-dd HH:mm", { locale: ko })
                : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("appeal.sqg7eui")}</dt>
            <dd>{accountStatusLabel(user.accountStatus)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("appeal.sqg68dl")}</dt>
            <dd className="mt-1 whitespace-pre-wrap">{user.suspensionReason ?? t("appeal.s1dicdvy")}</dd>
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
              setError(errorText(res.error));
              return;
            }
            setDone(true);
            router.refresh();
          });
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("cosplay.sz28d")}</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder={t("appeal.s1hj0mns")}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("appeal.s1votm2m")}</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder={t("appeal.s1l8mf8b")}
          />
          <p className="text-xs text-muted-foreground">{content.trim().length} / 5000</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("appeal.s8qmr0g")}</label>
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
          {t("appeal.s1kegbr3")}
        </label>

        <div className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ackTruth}
              onChange={(e) => setAckTruth(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            {t("appeal.s1xwydz2")}
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ackNotFalse}
              onChange={(e) => setAckNotFalse(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            {t("appeal.smw80nt")}
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ackNoRepeat}
              onChange={(e) => setAckNoRepeat(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            {t("appeal.s8q8udb")}
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href="/">{t("toast.cancel")}</Link>
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("appeal.s1xu4q7h")}
              </>
            ) : (
              t("appeal.s1kuqwr4")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
