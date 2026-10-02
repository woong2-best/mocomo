"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getRequestIp } from "@/lib/request-ip";
import {
  buildDraftFromPublished,
  getFraudRulesAdminPageData,
  initFraudRulesAdmin,
  previewFraudUserByUsername,
  publishFraudRules,
  simulateFraudRulesDraft,
  type FraudRulePublishPatch,
  type FraudRuleRowDto,
} from "@/lib/apt/economy/fraud/admin-fraud-rules-service";

const PATH = "/admin/economy/fraud/rules";

function revalidate() {
  revalidatePath(PATH);
  revalidatePath("/admin/economy/fraud");
}

async function adminIp() {
  const h = await headers();
  return (await getRequestIp()) || h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

export async function getFraudRulesAdminPageDataAction() {
  await requireAdmin();
  await initFraudRulesAdmin();
  return getFraudRulesAdminPageData();
}

export async function adminPublishFraudRules(
  patches: FraudRulePublishPatch[],
  reason: string
) {
  const admin = await requireAdmin();
  const ip = await adminIp();
  const res = await publishFraudRules(admin.id, patches, reason, ip);
  if ("ok" in res && res.ok) revalidate();
  return res;
}

export async function adminPreviewFraudUser(
  username: string,
  draftPatches: FraudRulePublishPatch[]
) {
  await requireAdmin();
  const page = await getFraudRulesAdminPageData();
  const draftRules =
    draftPatches.length > 0
      ? buildDraftFromPublished(
          page.rules,
          Object.fromEntries(draftPatches.map((p) => [p.id, p]))
        )
      : undefined;
  return previewFraudUserByUsername(username, draftRules);
}

export async function adminSimulateFraudRules(draftPatches: FraudRulePublishPatch[]) {
  await requireAdmin();
  const page = await getFraudRulesAdminPageData();
  const draftRules = buildDraftFromPublished(
    page.rules,
    Object.fromEntries(draftPatches.map((p) => [p.id, p]))
  );
  return simulateFraudRulesDraft(draftRules);
}

export type { FraudRuleRowDto, FraudRulePublishPatch };
