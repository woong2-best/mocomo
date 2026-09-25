/**
 * Culture Wiki covers must display at source quality (or better).
 * MAL default posters are ~225px; the `l` variant is the large file the site
 * should use on both web and mobile so a phone-width infobox is not upscaled
 * from a thumbnail.
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
