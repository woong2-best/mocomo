/**
 * Public YouTube video metadata for external live rooms (title + description).
 */

function apiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    null
  );
}

export type YoutubeVideoMetadata = {
  title: string | null;
  description: string | null;
};

export async function fetchYoutubeVideoMetadata(
  videoId: string,
  opts?: { accessToken?: string | null }
): Promise<YoutubeVideoMetadata> {
  const accessToken = opts?.accessToken?.trim() || null;
  const key = apiKey();

  if (key || accessToken) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", videoId);
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else if (key) {
      url.searchParams.set("key", key);
    }

    try {
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          items?: Array<{
            snippet?: { title?: string; description?: string };
          }>;
        };
        const snippet = data.items?.[0]?.snippet;
        if (snippet) {
          return {
            title: snippet.title?.trim() || null,
            description: snippet.description?.trim() || null,
          };
        }
      }
    } catch {
      /* fall through to oEmbed */
    }
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { next: { revalidate: 300 } }
    );
    if (oembed.ok) {
      const data = (await oembed.json()) as { title?: string };
      return {
        title: data.title?.trim() || null,
        description: null,
      };
    }
  } catch {
    /* optional */
  }

  return { title: null, description: null };
}
