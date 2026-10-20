const STORY_TEXT_MAX = 180;

export function storyCardText(input: {
  title?: string | null;
  content?: string | null;
}): string {
  const title = input.title?.replace(/\s+/g, " ").trim() ?? "";
  const content = input.content?.replace(/\s+/g, " ").trim() ?? "";
  const body = title && content && title !== content ? `${title}\n${content}` : title || content;
  if (body.length <= STORY_TEXT_MAX) return body;
  return `${body.slice(0, STORY_TEXT_MAX - 1).trimEnd()}…`;
}
