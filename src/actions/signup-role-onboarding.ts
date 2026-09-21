"use server";

import { redirect } from "next/navigation";
import { requireAuthForAction } from "@/lib/auth";
import { applyAsCosplayerForUser } from "@/lib/cosplayer-apply";
import {
  clearSignupNeedsRole,
  listOnboardingCosplayers,
  signupRoleContinuePath,
} from "@/lib/signup-role-onboarding";
import { toggleFollowForUser } from "@/lib/follow-service";

export async function loadSignupRoleCosplayers() {
  const user = await requireAuthForAction();
  const items = await listOnboardingCosplayers({ take: 24, viewerId: user.id });
  return { items };
}

export async function followOnboardingCosplayer(userId: string) {
  const user = await requireAuthForAction();
  const result = await toggleFollowForUser(user.id, userId);
  if ("error" in result) return { error: result.error };
  const pending = "requested" in result && result.requested === true;
  return {
    following: result.following === true || pending,
    pending,
  };
}

export async function completeSignupRoleFan(input?: { dest?: string }) {
  await requireAuthForAction();
  await clearSignupNeedsRole();
  redirect(signupRoleContinuePath(input?.dest));
}

export async function completeSignupRoleCoser(input: {
  bio: string;
  photoUrl: string;
  dest?: string;
}): Promise<{ error?: string }> {
  const user = await requireAuthForAction();
  const result = await applyAsCosplayerForUser(user.id, {
    bio: input.bio,
    photoUrl: input.photoUrl,
  });
  if ("error" in result) return { error: result.error };
  await clearSignupNeedsRole();
  redirect(signupRoleContinuePath(input.dest));
}

export async function skipSignupRoleCoser(input?: { dest?: string }) {
  await requireAuthForAction();
  await clearSignupNeedsRole();
  redirect(signupRoleContinuePath(input?.dest));
}
