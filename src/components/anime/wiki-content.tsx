"use client";

import { wikiHeadingId } from "@/lib/anime-revision";
import { WikiInline } from "@/components/anime/wiki-inline";

type FootnoteMap = Map<string, string>;

function parseFootnotes(source: string): { body: string; notes: FootnoteMap } {
  const notes: FootnoteMap = new Map();
  const lines = source.split("\n");
  const bodyLines: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\[\^(\d+)\]:\s*(.+)$/);
    if (m) {
      notes.set(m[1], m[2]);
      continue;
    }
    bodyLines.push(line);
  }
  return { body: bodyLines.join("\n"), notes };
}

function renderInline(text: string, notes: FootnoteMap, keyPrefix: string) {
  return <WikiInline text={text} notes={notes} keyPrefix={keyPrefix} />;
}

function YoutubeEmbed({ id }: { id: string }) {
  return (
    <div className="my-3 aspect-video rounded-xl overflow-hidden border border-border/60 bg-black">
      <iframe
        title="YouTube"
        src={`https://www.youtube.com/embed/${id}`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function extractYoutubeId(line: string): string | null {
  const tag = line.match(/^\[youtube:([a-zA-Z0-9_-]{6,})\]\s*$/);
  if (tag) return tag[1];
  const url = line.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/
  );
  return url?.[1] ?? null;
}

function parseTableBlock(lines: string[]): string[][] | null {
  if (lines.length < 1 || !lines[0].includes("|")) return null;
  const rows = lines
    .filter((l) => l.includes("|"))
    .map((l) => l.split("|").map((c) => c.trim()).filter((c) => c.length > 0));
  if (rows.length < 1) return null;
  if (rows[1]?.every((c) => /^[-:]+$/.test(c))) rows.splice(1, 1);
  return rows;
}

function CollapseBlock({ title, body }: { title: string; body: string }) {
  return (
    <details className="my-3 rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold hover:bg-muted/40">
        {title}
      </summary>
      <div className="px-3 pb-3 pt-1 text-sm text-muted-foreground border-t border-border/50">
        <WikiContent source={body} />
      </div>
    </details>
  );
}

export function WikiContent({
  source,
  className,
  headingIdPrefix = "w",
}: {
  source: string;
  className?: string;
  headingIdPrefix?: string;
}) {
  const { body, notes } = parseFootnotes(source);
  const blocks = body.split(/\n{2,}/);
  const rendered: React.ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const collapse = trimmed.match(/^\{\{collapse\|([^|]+)\|([\s\S]+)\}\}$/);
    if (collapse) {
      rendered.push(<CollapseBlock key={`c-${bi}`} title={collapse[1]} body={collapse[2]} />);
      return;
    }

    const yt = extractYoutubeId(trimmed);
    if (yt) {
      rendered.push(<YoutubeEmbed key={`yt-${bi}`} id={yt} />);
      return;
    }

    const table = parseTableBlock(trimmed.split("\n"));
    if (table && table.length > 0) {
      rendered.push(
        <div key={`tbl-${bi}`} className="my-3 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <tbody>
              {table.map((row, ri) => (
                <tr
                  key={ri}
                  className={ri === 0 ? "bg-muted/40 font-semibold" : "border-t border-border/40"}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top">
                      {renderInline(cell, notes, `t-${bi}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      const label = trimmed.slice(3);
      const id = `${headingIdPrefix}-${wikiHeadingId(label)}`;
      rendered.push(
        <h2 key={`h2-${bi}`} id={id} className="text-lg font-bold mt-5 mb-2 scroll-mt-24">
          {renderInline(label, notes, `h2-${bi}`)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      const label = trimmed.slice(2);
      const id = `${headingIdPrefix}-${wikiHeadingId(label)}`;
      rendered.push(
        <h3 key={`h-${bi}`} id={id} className="text-base font-bold mt-4 mb-1 scroll-mt-24">
          {renderInline(label, notes, `h-${bi}`)}
        </h3>
      );
      return;
    }

    rendered.push(
      <p key={`p-${bi}`} className="text-sm leading-relaxed whitespace-pre-wrap">
        {trimmed.split("\n").map((line, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderInline(line, notes, `p-${bi}-${li}`)}
          </span>
        ))}
      </p>
    );
  });

  if (notes.size > 0) {
    rendered.push(
      <ol key="footnotes" className="mt-4 pt-3 border-t border-border/50 text-xs space-y-1 list-decimal pl-4">
        {[...notes.entries()]
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([id, text]) => (
            <li key={id} id={`wiki-fn-${id}`}>
              <a href={`#wiki-fn-ref-${id}`} className="text-primary mr-1">
                ↩
              </a>
              {text}
            </li>
          ))}
      </ol>
    );
  }

  return <div className={className}>{rendered}</div>;
}

export const WIKI_EDITOR_HELP =
  "[[글 제목]] · [텍스트](URL) · {{뱃지}} · [youtube:ID] · ![설명](URL) · | 표 | · {{collapse|제목|내용}} · [^1] 각주";
