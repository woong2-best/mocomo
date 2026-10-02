import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireApiUser } from "@/lib/api-post-auth";
import {
  CollaboratorError,
  inviteCollaborators,
} from "@/lib/post-collaborators";

/** Spec-compatible alias: body { postId, userIds } */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "collab-invite", 30);
  if (limited) return limited;

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { postId?: string; userIds?: string[] };
  try {
    body = (await req.json()) as { postId?: string; userIds?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const postId = String(body.postId ?? "").trim();
  const userIds = Array.isArray(body.userIds) ? body.userIds.map(String) : [];
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await inviteCollaborators(postId, user.id, userIds);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof CollaboratorError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api/collaborators/invite]", e);
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
