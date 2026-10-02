"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestAnimeDeletion } from "@/actions/anime";
import { Button } from "@/components/ui/button";

export function AnimeDeleteRequestForm({ slug, title }: { slug: string; title: string }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await requestAnimeDeletion(slug, reason);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <p className="text-sm text-emerald-600">
        삭제 요청이 접수되었습니다. 운영진이 검토합니다.{" "}
        <Link href="/anime/delete-requests" className="underline">
          {t("anime.skxqldn")}
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        「{title}」 문서 삭제를 요청합니다. 운영진 승인 후 처리됩니다.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        minLength={10}
        rows={4}
        placeholder={t("anime.s1jn2tuo")}
        className="w-full rounded-xl border border-border bg-background p-3 text-sm"
      />
      <Button type="submit" disabled={loading} className="rounded-xl">
        {loading ? t("report.submitting") : t("anime.shaz1cm")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
