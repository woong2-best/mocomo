import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 =
  process.env.S3_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME
    ? new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      })
    : null;

function publicBase(): string | null {
  const raw = process.env.S3_PUBLIC_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function keyFromPublicUrl(url: string): string | null {
  const base = publicBase();
  if (!base || !url.startsWith(base + "/")) return null;
  try {
    return decodeURIComponent(url.slice(base.length + 1).split("?")[0] ?? "");
  } catch {
    return null;
  }
}

export type OriginVideoResponse = {
  status: number;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
};

/**
 * Pull the stored bytes without handing the public URL to the browser.
 * Prefers a signed GetObject when the URL is on our bucket so the bucket can
 * be made private later without changing the player.
 */
export async function fetchPaidOriginVideo(
  originUrl: string,
  range: string | null
): Promise<OriginVideoResponse> {
  const key = keyFromPublicUrl(originUrl);
  if (key && s3 && process.env.S3_BUCKET_NAME) {
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Range: range ?? undefined,
      })
    );
    const headers = new Headers();
    headers.set("Content-Type", out.ContentType || "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, max-age=60");
    if (out.ContentLength != null) headers.set("Content-Length", String(out.ContentLength));
    if (out.ContentRange) headers.set("Content-Range", out.ContentRange);
    const body = out.Body ? (out.Body.transformToWebStream() as ReadableStream<Uint8Array>) : null;
    return { status: range ? 206 : 200, headers, body };
  }

  const upstream = await fetch(originUrl, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
    redirect: "follow",
  });
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "video/mp4"
  );
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  headers.set("Cache-Control", "private, max-age=60");
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  return { status: upstream.status, headers, body: upstream.body };
}
