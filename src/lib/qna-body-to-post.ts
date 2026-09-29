import type { MediaType } from "@prisma/client";

const IMAGE_URL =
  /https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif)(?:\?\S*)?/gi;

export function qnaBodyToPost(name: string, description?: string | null) {
  const raw = (description ?? "").trim();
  const media: { url: string; type: MediaType }[] = [];
  const seen = new Set<string>();
  for (const match of raw.match(IMAGE_URL) ?? []) {
    const url = match.replace(/[),]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    media.push({ url, type: "IMAGE" });
  }
  let content = raw;
  for (const item of media) content = content.split(item.url).join("");
  content = content.replace(/\n{3,}/g, "\n\n").trim();
  if (!content) content = name.trim();
  return { content, media };
}
