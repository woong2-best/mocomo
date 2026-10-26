import { WikiExternalLink } from "@/components/anime/wiki-inline";

export function WikiTweetCard({
  url,
  handle,
}: {
  url: string;
  handle: string;
}) {
  return (
    <div className="my-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">Post on X</p>
      <p className="mt-1 text-sm font-medium">@{handle}</p>
      <p className="mt-2 text-sm">
        <WikiExternalLink href={url}>{url}</WikiExternalLink>
      </p>
    </div>
  );
}
