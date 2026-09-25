/**
 * Mirror of `src/lib/wiki-cover-url.ts` — keep the two in sync.
 * Culture Wiki must never display a smaller file than the web page.
 */
export function wikiCoverDisplayUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  const mal = raw.match(
    /^(https?:\/\/cdn\.myanimelist\.net\/images\/(?:anime|manga)\/\d+\/)(\d+)([tsl])?(\.(?:jpe?g|png|webp))(\?.*)?$/i
  );
  if (mal) {
    return `${mal[1]}${mal[2]}l${mal[4]}${mal[5] ?? ""}`;
  }

  const kitsu = raw.replace(
    /(\/anime\/(?:poster_images|cover_images)\/\d+\/)(tiny|small|medium|large)(\.[a-z]+)(\?.*)?$/i,
    "$1original$3$4"
  );
  if (kitsu !== raw) return kitsu;

  const anilist = raw.replace(/\/cover\/medium\//i, "/cover/large/");
  if (anilist !== raw) return anilist;

  return raw;
}
