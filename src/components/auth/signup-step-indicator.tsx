export function SignupStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["가입 정보", "사람 확인", "이메일 인증"] as const;
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <span key={label} className="flex items-center gap-1">
            {i > 0 && <span className="text-border">›</span>}
            <span
              className={
                active
                  ? "font-semibold text-foreground"
                  : done
                    ? "text-emerald-600"
                    : ""
              }
            >
              {n}. {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
