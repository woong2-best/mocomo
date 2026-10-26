"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { wikiHeadingId } from "@/lib/anime-revision";
import { parseWikiBlocks } from "@/lib/wiki/blocks";
import { collectStarFootnotes } from "@/lib/wiki/markup";
import { extractWikiVideos, wikiVideoLink, type WikiVideo } from "@/lib/wiki/media";
import { WikiExternalLink, WikiInline } from "@/components/anime/wiki-inline";
import { WikiTweetCard } from "@/components/anime/wiki-tweet-card";
import { WikiVideoPlayer } from "@/components/anime/wiki-video";

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
  return { body: collectStarFootnotes(bodyLines.join("\n"), notes), notes };
}

function renderInline(text: string, notes: FootnoteMap, keyPrefix: string) {
  return <WikiInline text={text} notes={notes} keyPrefix={keyPrefix} />;
}

function WikiLinkedVideo({ source, video }: { source: string; video: WikiVideo }) {
  const link = wikiVideoLink(source, video.url);
  return (
    <div className="my-3 max-w-[480px] space-y-1.5">
      <p className="text-sm leading-relaxed">
        <WikiExternalLink href={link.href}>{link.label}</WikiExternalLink>
      </p>
      <WikiVideoPlayer video={video} className="my-0" />
    </div>
  );
}

function youtubeVideo(id: string) {
  return {
    kind: "youtube" as const,
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  };
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
    if (block.type === "collapse" || block.type === "fold") {
      rendered.push(<CollapseBlock key={`c-${bi}`} title={block.title} body={block.body} />);
      return;
    }

    if (block.type === "quote") {
      rendered.push(
        <blockquote
          key={`q-${bi}`}
          className="my-3 rounded-r-xl border-l-4 border-[hsl(var(--folk-terracotta))] bg-[hsl(var(--folk-cream)/0.35)] px-3 py-2 text-sm italic dark:bg-muted/30"
        >
          <span className="block leading-relaxed whitespace-pre-wrap">
            {renderInline(block.text, notes, `q-${bi}`)}
          </span>
        </blockquote>
      );
      return;
    }

    if (block.type === "tweet") {
      rendered.push(<WikiTweetCard key={`tw-${bi}`} url={block.url} handle={block.handle} />);
      return;
    }

    if (block.type === "youtube") {
      rendered.push(
        <WikiLinkedVideo key={`yt-${bi}`} source={block.source} video={youtubeVideo(block.id)} />
      );
      return;
    }

    if (block.type === "video") {
      rendered.push(
        <WikiLinkedVideo key={`vid-${bi}`} source={block.source} video={block.video} />
      );
      return;
    }

    if (block.type === "table") {
      rendered.push(
        <div key={`tbl-${bi}`} className="my-3 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 dark:bg-muted/40">
                {block.rows[0]?.map((cell, ci) => (
                  <th
                    key={ci}
                    className="border-b border-border/70 px-3 py-2 text-left font-semibold"
                  >
                    {renderInline(cell, notes, `th-${bi}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-t border-border/40 even:bg-muted/20">
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

    const inlineVideos = extractWikiVideos(block.text);
    rendered.push(
      <p key={`p-${bi}`} className="text-sm leading-relaxed whitespace-pre-wrap">
        {renderInline(block.text, notes, `p-${bi}`)}
      </p>
    );
    inlineVideos.forEach((video, vi) => {
      rendered.push(<WikiVideoPlayer key={`pvid-${bi}-${vi}`} video={video} />);
    });
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
