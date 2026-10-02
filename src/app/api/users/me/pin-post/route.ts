import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { pinPostToProfile, unpinPostFromProfile } from "@/actions/post-pin";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "user-pin-post", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  let body: { postId?: string };
  try {
    body = (await req.json()) as { postId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const postId = typeof body.postId === "string" ? body.postId.trim() : "";
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const res = await pinPostToProfile(postId);
  if (res.error) {
    return NextResponse.json({ error: errorText(res.error) }, { status: 400 });
  }
  return NextResponse.json({ ok: true, pinnedPostId: postId });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "user-unpin-post", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  let postId = req.nextUrl.searchParams.get("postId")?.trim() ?? "";
  if (!postId) {
    try {
      const body = (await req.json()) as { postId?: string };
      postId = typeof body.postId === "string" ? body.postId.trim() : "";
    } catch {
      postId = "";
    }
  }

  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const res = await unpinPostFromProfile(postId);
  if (res.error) {
    return NextResponse.json({ error: errorText(res.error) }, { status: 400 });
  }
  return NextResponse.json({ ok: true, pinnedPostId: null });
}
