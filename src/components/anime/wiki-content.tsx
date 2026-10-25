"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { wikiHeadingId } from "@/lib/anime-revision";
import { parseWikiBlocks } from "@/lib/wiki/blocks";
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
  const blocks = parseWikiBlocks(body);
  const rendered: React.ReactNode[] = [];

  blocks.forEach((block, bi) => {
    if (block.type === "collapse") {
      rendered.push(<CollapseBlock key={`c-${bi}`} title={block.title} body={block.body} />);
      return;
    }

    if (block.type === "youtube") {
      rendered.push(<YoutubeEmbed key={`yt-${bi}`} id={block.id} />);
      return;
    }

    if (block.type === "table") {
      rendered.push(
        <div key={`tbl-${bi}`} className="my-3 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <tbody>
              {block.rows.map((row, ri) => (
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

    if (block.type === "heading") {
      const id = `${headingIdPrefix}-${wikiHeadingId(block.label)}`;
      if (block.level === 2) {
        rendered.push(
          <h2 key={`h2-${bi}`} id={id} className="text-lg font-bold mt-5 mb-2 scroll-mt-24">
            {renderInline(block.label, notes, `h2-${bi}`)}
          </h2>
        );
        return;
      }
      rendered.push(
        <h3 key={`h-${bi}`} id={id} className="text-base font-bold mt-4 mb-1 scroll-mt-24">
          {renderInline(block.label, notes, `h-${bi}`)}
        </h3>
      );
      return;
    }

    rendered.push(
      <p key={`p-${bi}`} className="text-sm leading-relaxed whitespace-pre-wrap">
        {block.text.split("\n").map((line, li) => (
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
  t("anime.s8h8zc2");
