"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Input } from "@/components/ui/input";
import { QNA_BOUNTY_DEFAULT_CENTI, formatQnaBountyMoco } from "@/lib/qna-bounty-format";

export function QnaBountyField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="qna-bounty" className="text-sm font-semibold">
          {t("qna.bounty")}{" "}
          <span className="font-normal text-muted-foreground">({t("qna.bounty_optional")})</span>
        </label>
        <span className="text-[11px] text-muted-foreground">
          {formatQnaBountyMoco(QNA_BOUNTY_DEFAULT_CENTI)} {t("qna.bounty_unit")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="qna-bounty"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("qna.bounty_placeholder")}
          disabled={disabled}
          className="rounded-sm max-w-[160px]"
        />
        <span className="text-sm font-medium text-folk-cobalt">{t("qna.bounty_unit")}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t("qna.bounty_hint")}</p>
    </div>
  );
}
