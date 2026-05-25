import { AlertCircle } from "lucide-react";

/** DB 미연동 시 사용자용 안내 (개발자용 SQL 문구 최소화) */
export function DbSetupBanner({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex gap-3 mb-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-100">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {detail ?? "잠시 후 다시 시도해 주세요. 문제가 계속되면 운영팀에 문의해 주세요."}
        </p>
      </div>
    </div>
  );
}
