export type VideoDonationBlocklist = {
  videoIds?: string[];
  channelIds?: string[];
  keywords?: string[];
};

export function parseVideoDonationBlocklist(raw: unknown): VideoDonationBlocklist {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pick = (key: string) =>
    Array.isArray(o[key])
      ? o[key].filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : [];
  return {
    videoIds: pick("videoIds"),
    channelIds: pick("channelIds"),
    keywords: pick("keywords").map((k) => k.toLowerCase()),
  };
}

export function checkVideoDonationBlocklist(input: {
  blocklist: VideoDonationBlocklist;
  videoId: string;
  channelId: string;
  title: string;
}): string | null {
  const vid = input.videoId.toLowerCase();
  const ch = input.channelId.toLowerCase();
  const title = input.title.toLowerCase();

  if (input.blocklist.videoIds?.some((id) => id.toLowerCase() === vid)) {
    return "This video is blocked by the streamer.";
  }
  if (input.blocklist.channelIds?.some((id) => id.toLowerCase() === ch)) {
    return "This video is from a channel blocked by the streamer.";
  }
  for (const kw of input.blocklist.keywords ?? []) {
    if (kw && title.includes(kw)) {
      return "This video contains a keyword blocked by the streamer.";
    }
  }
  return null;
}
