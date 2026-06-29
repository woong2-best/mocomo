import { APT_GAME_PATH } from "@/lib/site-routes";

export type AptMailboxComposeParams = {
  communityId?: string;
  initialContent?: string;
  initialTitle?: string;
};

/** APT 우편함 배치·글쓰기 화면으로 이동하는 URL */
export function buildAptMailboxUrl(params?: AptMailboxComposeParams): string {
  const q = new URLSearchParams();
  q.set("decor", "mailbox");
  if (params?.communityId) q.set("community", params.communityId);
  if (params?.initialContent) q.set("text", params.initialContent);
  if (params?.initialTitle) q.set("title", params.initialTitle);
  return `${APT_GAME_PATH}?${q.toString()}`;
}

export function parseAptMailboxParams(searchParams: URLSearchParams): AptMailboxComposeParams & { decorMailbox: boolean } {
  return {
    decorMailbox: searchParams.get("decor") === "mailbox",
    communityId: searchParams.get("community") ?? undefined,
    initialContent: searchParams.get("text") ?? undefined,
    initialTitle: searchParams.get("title") ?? undefined,
  };
}
