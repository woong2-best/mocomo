import { uploadBufferToSupabase } from "@/lib/supabase-storage";

async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&apos;";
  });
}

export function isOwnStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const target = new URL(url);
    const allowed = new URL(base);
    return target.host === allowed.host && target.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

export async function lightPortfolioWatermark(input: Buffer, label: string): Promise<Buffer> {
  const sharp = await loadSharp();
  const image = sharp(input, { animated: false, failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 800;
  const font = Math.max(22, Math.round(Math.min(width, height) / 12));
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.55">
        <text x="50%" y="46%" text-anchor="middle" fill="#ffffff" stroke="#000000" stroke-width="2"
          font-size="${font}" font-family="sans-serif" font-weight="700">${escapeXml(label)}</text>
        <text x="18%" y="72%" text-anchor="middle" fill="#ffffff" font-size="${Math.round(font * 0.72)}"
          font-family="sans-serif" font-weight="700" transform="rotate(-28 ${Math.round(width * 0.18)} ${Math.round(height * 0.72)})">${escapeXml(label)}</text>
        <text x="78%" y="30%" text-anchor="middle" fill="#ffffff" font-size="${Math.round(font * 0.72)}"
          font-family="sans-serif" font-weight="700" transform="rotate(-28 ${Math.round(width * 0.78)} ${Math.round(height * 0.3)})">${escapeXml(label)}</text>
      </g>
    </svg>`
  );
  return image.composite([{ input: svg, gravity: "centre" }]).jpeg({ quality: 82 }).toBuffer();
}

/** Still images on our storage are replaced with a light MoCoMo watermark. GIF and video stay as uploaded. */
export async function watermarkPortfolioUrl(
  url: string,
  label: string,
  userId: string
): Promise<string> {
  if (!isOwnStorageUrl(url)) return url;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return url;
  const type = (response.headers.get("content-type") || "").split(";")[0]?.trim().toLowerCase() || "";
  if (type.startsWith("video/") || type === "image/gif") return url;
  if (!type.startsWith("image/")) return url;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 32 || bytes.length > 12_000_000) return url;
  const marked = await lightPortfolioWatermark(bytes, label);
  const uploaded = await uploadBufferToSupabase(userId, marked, "portfolio-watermark.jpg", "image/jpeg", "image");
  if ("error" in uploaded) return url;
  return uploaded.publicUrl;
}
