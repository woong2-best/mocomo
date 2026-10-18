import { parseVideoEmbed, type StudioPortfolioBlock } from "@/lib/studio-portfolio";

export function StudioPortfolioView({
  coverUrl,
  blocks,
}: {
  coverUrl?: string;
  blocks?: StudioPortfolioBlock[];
}) {
  return (
    <div className="space-y-4">
      {coverUrl ? (
        <img src={coverUrl} alt="" className="w-full rounded-2xl object-cover" />
      ) : null}
      {(blocks ?? []).map((block) => {
        if (block.type === "text") {
          return (
            <p key={block.id} className="whitespace-pre-wrap text-[15px] leading-7">
              {block.text}
            </p>
          );
        }
        if (block.type === "image") {
          return <img key={block.id} src={block.url} alt="" className="w-full rounded-2xl object-cover" />;
        }
        const embed = parseVideoEmbed(block.url);
        if (!embed) return null;
        return (
          <div key={block.id} className="aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe
              src={embed.embedSrc}
              title="Portfolio video"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        );
      })}
    </div>
  );
}
