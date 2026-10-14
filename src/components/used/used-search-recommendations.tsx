import Link from "next/link";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export function UsedSearchRecommendations({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <p className="px-0.5 text-xs font-extrabold text-foreground">{t("used.query.recommended")}</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {labels.map((label) => (
          <Link
            key={label}
            href={`/market?q=${encodeURIComponent(label)}`}
            className="shrink-0 rounded-full border-[1.5px] border-folk-terracotta/40 bg-folk-cream px-3.5 py-2 text-[13px] font-extrabold text-folk-terracotta whitespace-nowrap hover:border-folk-terracotta hover:bg-folk-terracotta hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
