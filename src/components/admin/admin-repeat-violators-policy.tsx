import Link from "next/link";
import { REPEAT_VIOLATORS_POLICY } from "@/lib/moderation-repeat-violators";
import { ShieldAlert } from "lucide-react";

export function AdminRepeatViolatorsPolicy() {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-orange-600" />
        {REPEAT_VIOLATORS_POLICY.title}
      </h3>
      <p className="text-xs text-muted-foreground">{REPEAT_VIOLATORS_POLICY.summary}</p>
      <ul className="space-y-2 text-xs">
        {REPEAT_VIOLATORS_POLICY.steps.map((step) => (
          <li key={step.warnings} className="flex gap-2">
            <span className="shrink-0 font-medium w-16">{step.warnings}</span>
            <span className="text-muted-foreground">{step.action}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        중대 위반 ({REPEAT_VIOLATORS_POLICY.severeViolationReasons.join(", ")}): 경고 없이 즉시
        영구 정지.
      </p>
      <Link
        href="/legal/moderation"
        target="_blank"
        className="text-xs text-primary hover:underline"
      >
        공개 정책 페이지 →
      </Link>
    </section>
  );
}
