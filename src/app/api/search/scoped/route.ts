import { NextResponse, type NextRequest } from "next/server";
import { rateLimitPublicApi, verifyApiOrigin } from "@/lib/api-security";
import { recordScopedSearch } from "@/lib/scoped-search-rank";
import type { HeaderSearchScope } from "@/lib/header-search-context";

const ALLOWED_SCOPES = new Set<HeaderSearchScope>([
  "used",
  "market",
  "live",
  "wiki",
  "community",
  "social",
]);

export async function POST(req: NextRequest) {
  if (!verifyApiOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const limited = await rateLimitPublicApi(req, "search-scoped", 120);
  if (limited) return limited;

  let body: { scope?: string; q?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const scope = body.scope as HeaderSearchScope | undefined;
  const q = body.q?.trim() ?? "";
  if (!scope || !ALLOWED_SCOPES.has(scope) || q.length < 1) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const bucket = scope === "social" ? "feed" : scope;
  await recordScopedSearch(bucket, q);

  return NextResponse.json({ ok: true });
}
