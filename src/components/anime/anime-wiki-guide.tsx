import Link from "next/link";
import { ANIME_WIKI_SECTIONS, type WikiFeatureItem } from "@/lib/anime-wiki-features";
import { cn } from "@/lib/utils";

function StatusDot({ status }: { status: WikiFeatureItem["status"] }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-1.5",
        status === "live" && "bg-emerald-500",
        status === "partial" && "bg-amber-500",
        status === "planned" && "bg-muted-foreground/40"
      )}
      title={status === "live" ? "이용 가능" : status === "partial" ? "일부 지원" : "준비 중"}
    />
  );
}

function FeatureLine({ item }: { item: WikiFeatureItem }) {
  const inner = (
    <>
      <StatusDot status={item.status} />
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="flex items-start gap-2 text-sm hover:text-[#1e88e5]">
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 text-sm text-foreground/90">
      {inner}
    </li>
  );
}

export function AnimeWikiGuide() {
  return (
    <article className="rounded-2xl border border-border bg-card/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <h2 className="text-lg font-bold">애니 위키 안내</h2>
        <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 이용 가능
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> 일부 지원
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> 준비 중
          </span>
        </p>
      </div>

      <div className="p-5 space-y-8 text-[15px] leading-relaxed">
        {ANIME_WIKI_SECTIONS.map((section, idx) => (
          <section key={section.id}>
            {idx > 0 && <hr className="border-border/60 mb-8" />}
            <h3 className="text-base font-bold mb-3">{section.title}</h3>

            {section.items.length > 0 && (
              <ul className="space-y-1.5 list-none pl-0">
                {section.items.map((item) => (
                  <FeatureLine key={item.label} item={item} />
                ))}
              </ul>
            )}

            {section.example && (
              <p className="mt-3 text-sm text-muted-foreground">
                예시:
                <code className="ml-2 px-2 py-0.5 rounded bg-muted font-mono text-foreground">{section.example}</code>
              </p>
            )}

            {section.blocks?.map((block) => (
              <div key={block.title} className="mt-3">
                <p className="text-sm font-medium text-muted-foreground">{block.title}:</p>
                <ul className="mt-1 space-y-0.5 list-none">
                  {block.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">*</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
