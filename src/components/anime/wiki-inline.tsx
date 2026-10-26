"use client";

import { wikiLinkSlug } from "@/lib/anime-revision";
import { useWikiLinkStatus } from "@/components/anime/wiki-link-context";
import { WikiFootnote } from "@/components/anime/wiki-footnote";
import { WikiLinkPreview } from "@/components/anime/wiki-link-preview";
import { WikiSpoiler } from "@/components/anime/wiki-spoiler";
import { isExternalHref } from "@/lib/linkify";
import { parseWikiInline, wikiSizeClass, type WikiInlineNode } from "@/lib/wiki/markup";
import { cn } from "@/lib/utils";

type FootnoteMap = Map<string, string>;

export const WIKI_HYPERLINK_CLASS =
  "text-emerald-600 dark:text-emerald-400 font-medium underline underline-offset-2 hover:text-emerald-500 dark:hover:text-emerald-300 inline-flex items-center gap-0.5 break-all";

export function WikiExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const external = isExternalHref(href) || /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={cn(WIKI_HYPERLINK_CLASS, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external && <span className="text-[10px] opacity-70">↗</span>}
    </a>
  );
}

function renderNodes(
  nodes: WikiInlineNode[],
  notes: FootnoteMap,
  keyPrefix: string,
  linkStatus: ReturnType<typeof useWikiLinkStatus>
): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    const kids = "children" in node ? renderNodes(node.children, notes, key, linkStatus) : null;

    switch (node.type) {
      case "text":
        return <span key={key}>{node.value}</span>;
      case "bold":
        return <strong key={key}>{kids}</strong>;
      case "italic":
        return <em key={key}>{kids}</em>;
      case "strike":
        return (
          <s key={key} className="text-muted-foreground">
            {kids}
          </s>
        );
      case "spoiler":
        return <WikiSpoiler key={key}>{kids}</WikiSpoiler>;
      case "sup":
        return <sup key={key}>{kids}</sup>;
      case "sub":
        return <sub key={key}>{kids}</sub>;
      case "color":
        return (
          <span key={key} style={{ color: node.color }}>
            {kids}
          </span>
        );
      case "size":
        return (
          <span key={key} className={wikiSizeClass(node.step)}>
            {kids}
          </span>
        );
      case "highlight":
        return (
          <mark key={key} className="rounded-sm px-0.5" style={{ backgroundColor: node.color }}>
            {kids}
          </mark>
        );
      case "wikilink": {
        const resolved = linkStatus?.[node.target];
        const exists = linkStatus ? Boolean(resolved?.exists) : true;
        const slug = resolved?.slug ?? wikiLinkSlug(node.target);
        const href = exists ? `/anime/${slug}` : `/anime/new?title=${encodeURIComponent(node.target)}`;
        return (
          <WikiLinkPreview key={key} href={href} title={node.target} exists={exists}>
            {node.label}
          </WikiLinkPreview>
        );
      }
      case "link":
        return (
          <WikiExternalLink key={key} href={node.href}>
            {node.label}
          </WikiExternalLink>
        );
      case "image":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={key}
            src={node.src}
            alt={node.alt}
            className="my-2 max-w-full rounded-lg border border-border/60"
            loading="lazy"
          />
        );
      case "footnote":
        return <WikiFootnote key={key} id={node.id} preview={notes.get(node.id)} />;
      case "badge":
        return (
          <span
            key={key}
            className="mx-0.5 inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
          >
            {node.value}
          </span>
        );
      default:
        return null;
    }
  });
}

export function WikiInline({
  text,
  notes = new Map(),
  keyPrefix = "wi",
  className,
}: {
  text: string;
  notes?: FootnoteMap;
  keyPrefix?: string;
  className?: string;
}) {
  const linkStatus = useWikiLinkStatus();
  const nodes = parseWikiInline(text);
  if (nodes.length === 1 && nodes[0]?.type === "text") {
    return <span className={className}>{nodes[0].value}</span>;
  }
  return <span className={cn(className)}>{renderNodes(nodes, notes, keyPrefix, linkStatus)}</span>;
}
