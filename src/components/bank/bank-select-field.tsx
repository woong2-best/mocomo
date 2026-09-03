"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BANK_GROUP_LABELS,
  getKrQuickPickBanks,
  getKrBankCatalogEntry,
  searchKrBanks,
  type BankCatalogEntry,
  type BankCatalogGroup,
} from "@/lib/apick/bank-catalog";

const GROUP_ORDER: BankCatalogGroup[] = [
  "commercial",
  "internet",
  "regional",
  "securities",
  "other",
];

export function BankSelectField({
  value,
  onChange,
  disabled,
  locale = "ko",
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  locale?: import("@/lib/i18n/config").Locale;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = getKrBankCatalogEntry(value);
  const quickBanks = getKrQuickPickBanks();

  const filtered = useMemo(() => searchKrBanks(query), [query]);

  const grouped = useMemo(() => {
    if (query.trim()) {
      return [{ group: null as BankCatalogGroup | null, banks: filtered }];
    }
    return GROUP_ORDER.map((group) => ({
      group,
      banks: filtered.filter((b) => b.group === group && !b.quickPick),
    })).filter((g) => g.banks.length > 0);
  }, [filtered, query]);

  const en = locale === "en";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {en ? "Popular banks" : "🇰🇷 자주 쓰는 은행"}
        </p>
        <div className="flex flex-wrap gap-2">
          {quickBanks.map((b) => (
            <button
              key={b.code}
              type="button"
              disabled={disabled}
              onClick={() => onChange(b.code)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                value === b.code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted/60"
              )}
            >
              {en ? b.nameEn.split(" ")[0] : b.name.replace(/은행|뱅크/g, "").slice(0, 6)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={en ? 'Search bank (e.g. "Mirae", "키움")' : '은행 검색 (예: "미래", "Chase")'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="rounded-xl h-11 pl-9"
          disabled={disabled}
        />
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-3 h-11 text-sm"
      >
        <span className="truncate font-medium">
          {selected
            ? `${selected.name} (${selected.code})`
            : en
              ? "Select bank"
              : "은행 선택"}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && !disabled && (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background shadow-md">
          {grouped.map(({ group, banks }) => (
            <div key={group ?? "search"}>
              {group && (
                <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-[11px] font-bold text-muted-foreground backdrop-blur">
                  {en ? BANK_GROUP_LABELS[group].en : BANK_GROUP_LABELS[group].ko}
                </p>
              )}
              {banks.map((b) => (
                <BankRow
                  key={b.code}
                  bank={b}
                  selected={value === b.code}
                  en={en}
                  onPick={() => {
                    onChange(b.code);
                    setOpen(false);
                    setQuery("");
                  }}
                />
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              {en ? "No banks found" : "검색 결과가 없습니다"}
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {en
          ? "1 KRW verification via Apick · Korea only. JP/US banks coming soon (Stripe Connect)."
          : "Apick 1원 인증 · 한국 계좌만 지원. 일본·미국 은행은 Stripe Connect 연동 준비 중."}
      </p>
    </div>
  );
}

function BankRow({
  bank,
  selected,
  en,
  onPick,
}: {
  bank: BankCatalogEntry;
  selected: boolean;
  en: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50",
        selected && "bg-primary/5"
      )}
    >
      <Check className={cn("h-4 w-4 shrink-0 text-primary", !selected && "opacity-0")} />
      <span className="flex-1 truncate font-medium">{en ? bank.nameEn : bank.name}</span>
      <span className="text-xs text-muted-foreground">{bank.code}</span>
    </button>
  );
}
