import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
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

export function FeedAdCard({ ad }: { ad: FeedAd }) {
  const href = sanitizeAdLink(ad.linkUrl);
  const external = isExternalUrl(href);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden h-full min-h-[280px] flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="px-3 py-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-amber-400/90 border-b border-amber-500/20">
          <span>Sponsored</span>
          <span>{ad.adCategory || "광고"}</span>
        </div>
        {ad.sponsorName && (
          <p className="px-3 pt-2 text-xs text-muted-foreground">{ad.sponsorName}</p>
        )}
        <Link
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="block flex-1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full aspect-[4/5] object-cover"
          />
        </Link>
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium line-clamp-2">{ad.title}</p>
          <Link
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
          >
            {ad.ctaLabel || "자세히 보기"}
            {external && <ExternalLink className="h-3 w-3" />}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
