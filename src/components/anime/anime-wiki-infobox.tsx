"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { parseWikiInfobox, type WikiInfoboxSection } from "@/lib/anime-wiki-infobox";
import { WikiInline } from "@/components/anime/wiki-inline";
import { cn } from "@/lib/utils";

function InfoboxSection({ section, defaultOpen }: { section: WikiInfoboxSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-folk-cobalt/20 overflow-hidden bg-card/90 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 bg-[hsl(var(--folk-gold)/0.12)] hover:bg-[hsl(var(--folk-gold)/0.18)] transition-colors text-left"
      >
        <span className="text-sm font-semibold text-folk-cobalt">{section.title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <table className="w-full text-xs border-collapse">
          <tbody>
            {section.rows.map((row) => (
              <tr key={`${section.title}-${row.label}`} className="border-t border-border/50">
                <th
                  scope="row"
                  className="w-[36%] min-w-[5.5rem] px-2.5 py-2 bg-muted/45 text-muted-foreground font-semibold align-top text-center leading-snug"
                >
                  {row.label}
                </th>
                <td className="px-2.5 py-2 align-top text-foreground/90 leading-relaxed">
                  {row.value.split("\n").map((line, li) => (
                    <div key={li} className={li > 0 ? "mt-1 pt-1 border-t border-border/30" : undefined}>
                      <WikiInline text={line} keyPrefix={`ib-${section.title}-${row.label}-${li}`} />
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AnimeWikiInfobox({ source, className }: { source: string | null | undefined; className?: string }) {
  const sections = parseWikiInfobox(source);
  if (sections.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {sections.map((section, i) => (
        <InfoboxSection key={section.title} section={section} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
