import Link from "next/link";
import { userDisplayName } from "@/lib/user-public-select";
import { SensitiveContentGate } from "@/components/media/sensitive-content-gate";
import { cn } from "@/lib/utils";
import type { QuotedPostPreview } from "@/lib/quoted-post";

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  post: QuotedPostPreview;
  /** Feed cards link to the original post; compose preview is static. */
  href?: string;
  className?: string;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
};

export function QuotePostPreviewCard({
  post,
  href,
  className,
  isOwner = false,
  viewerShowNsfw = false,
}: Props) {
  const name = userDisplayName(post.author);
  const cover = post.media?.[0];
  const durationLabel =
    cover?.type === "VIDEO" ? formatDuration(cover.duration) : null;

  const inner = (
    <>
      <div className="px-3 pt-3 pb-2">
        <p className="truncate text-[13px] font-semibold">
          {name}{" "}
          <span className="font-normal text-muted-foreground">@{post.author.username}</span>
        </p>
        {post.title ? <p className="mt-1 truncate text-sm font-medium">{post.title}</p> : null}
        {post.content ? (
          <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {post.content}
          </p>
        ) : null}
      </div>
      {cover?.url ? (
        <SensitiveContentGate
          isNsfw={post.isNsfw}
          isOwner={isOwner}
          viewerShowNsfw={viewerShowNsfw}
          className="border-t border-border/60"
        >
          <div className="relative aspect-[16/10] max-h-72 w-full overflow-hidden bg-muted">
            {cover.type === "VIDEO" ? (
              <video
                src={cover.url}
                poster={cover.posterUrl ?? undefined}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={cover.posterUrl || cover.url}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            {durationLabel ? (
              <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                {durationLabel}
              </span>
            ) : null}
          </div>
        </SensitiveContentGate>
      ) : null}
    </>
  );

  const shellClass = cn(
    "block overflow-hidden rounded-2xl border border-border bg-muted/20",
    href && "hover:bg-muted/40 transition-colors",
    className
  );

  if (href) {
    return (
      <Link href={href} className={shellClass}>
        {inner}
      </Link>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}
