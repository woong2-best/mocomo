"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminExportBirthDateHistoryCsvAction } from "@/actions/admin-cms";
import { errorText } from "@/lib/i18n/error-text";

export function AdminBirthDateExport({ userId, username }: { userId: string; username: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void adminExportBirthDateHistoryCsvAction(userId)
            .then((res) => {
              if (!res.ok || !res.csv) {
                setError(res.ok ? "내보낼 이력이 없습니다." : errorText(res.error));
                return;
              }
              const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.filename || `birth-date-${username}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            })
            .catch(() => setError("CSV를 만들지 못했습니다."))
            .finally(() => setPending(false));
        }}
      >
        {pending ? "내보내는 중…" : "이력 CSV 내보내기"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
