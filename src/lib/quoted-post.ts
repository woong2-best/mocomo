const QUOTE_PREVIEW_CHARS = 180;

export const quotedPostPreviewSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  isNsfw: true,
  author: {
    select: { id: true, username: true, name: true, image: true },
  },
  media: {
    take: 1,
    orderBy: { order: "asc" as const },
    select: { url: true, type: true, posterUrl: true, duration: true },
  },
} as const;

export type QuotedPostPreview = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  isNsfw: boolean;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  media: { url: string; type: string; posterUrl: string | null; duration: number | null }[];
};

type QuotedRow = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date | string;
  isNsfw: boolean;
  author: QuotedPostPreview["author"];
  media: QuotedPostPreview["media"];
};

export function toQuotedPostPreview(row: QuotedRow | null | undefined): QuotedPostPreview | null {
  if (!row) return null;
  const content =
    row.content.length > QUOTE_PREVIEW_CHARS
      ? `${row.content.slice(0, QUOTE_PREVIEW_CHARS)}…`
      : row.content;
  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
  return {
    id: row.id,
    title: row.title,
    content,
    createdAt,
    isNsfw: !!row.isNsfw,
    author: row.author,
    media: row.media ?? [],
  };
}

export function readQuotedPost(post: object): QuotedPostPreview | null {
  const raw = (post as { quotedPost?: unknown }).quotedPost;
  if (!raw || typeof raw !== "object" || !("id" in raw) || !("content" in raw)) return null;
  return toQuotedPostPreview(raw as QuotedRow);
}
