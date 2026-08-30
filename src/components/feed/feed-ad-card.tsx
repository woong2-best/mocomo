import Link from "next/link";
import { ExternalLink, Heart, MessageSquare, BarChart2, Bookmark, Share2 } from "lucide-react";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";

type FeedAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

function sponsorHandle(name: string | null | undefined): string {
  const base = (name || "MoCoMo").replace(/\s+/g, "").slice(0, 15);
  return `@${base.toLowerCase()}`;
}

function sourceLabel(url: string): string | null {
  try {
    const href = sanitizeAdLink(url);
    if (!isExternalUrl(href)) return null;
    const host = new URL(href).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function FeedAdCard({ ad }: { ad: FeedAd }) {
  const href = sanitizeAdLink(ad.linkUrl);
  const external = isExternalUrl(href);
  const sponsor = ad.sponsorName?.trim() || "MoCoMo";
  const source = sourceLabel(ad.linkUrl);

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex gap-3 p-4 pb-2">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-[#A855F7]/15 ring-1 ring-[#A855F7]/30 flex items-center justify-center text-sm font-bold text-[#A855F7]"
          aria-hidden
        >
          {sponsor.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[15px] leading-tight">
                <span className="font-bold text-foreground truncate">{sponsor}</span>
                <span className="text-muted-foreground truncate">{sponsorHandle(ad.sponsorName)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
              <span>{ad.adCategory || "광고"}</span>
            </div>
          </div>
          <Link
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-2 block group"
          >
            <p className="text-[15px] whitespace-pre-wrap break-words group-hover:underline decoration-muted-foreground/40">
              {ad.title}
            </p>
          </Link>
          <Link
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-3 block rounded-2xl overflow-hidden border border-border/80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full aspect-[16/9] object-cover"
            />
          </Link>
          {source && (
            <p className="mt-2 text-xs text-muted-foreground">
              출처:{" "}
              <Link
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="hover:underline"
              >
                {source}
              </Link>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 text-muted-foreground">
        <div className="flex items-center gap-1 text-xs">
          <span className="flex items-center gap-1 min-h-8 px-2 rounded-lg opacity-60">
            <MessageSquare className="h-4 w-4" />
          </span>
          <span className="flex items-center gap-1 min-h-8 px-2 rounded-lg opacity-60">
            <Heart className="h-4 w-4" />
          </span>
          <span className="flex items-center gap-1 min-h-8 px-2 rounded-lg opacity-60">
            <BarChart2 className="h-4 w-4" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#A855F7] hover:underline px-2 py-1"
          >
            {ad.ctaLabel || "자세히 보기"}
            {external && <ExternalLink className="h-3 w-3" />}
          </Link>
          <span className="flex items-center min-h-8 min-w-8 justify-center opacity-60">
            <Bookmark className="h-4 w-4" />
          </span>
          <span className="flex items-center min-h-8 min-w-8 justify-center opacity-60">
            <Share2 className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
