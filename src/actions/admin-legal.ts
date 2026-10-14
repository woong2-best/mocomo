"use server";

import { requireAdminPermission, requireAdminStepUp, AdminAccessError } from "@/lib/admin/access";
import {
  cancelScheduledLegalDocument,
  getLegalEditorPayload,
  listLegalEditorSummaries,
  saveLegalDocument,
} from "@/lib/legal/legal-document-store";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    if (e.message === "ADMIN_STEPUP_REQUIRED") return "ADMIN_STEPUP_REQUIRED";
    return e.message === "UNAUTHORIZED" ? "common.error.authRequired" : "actions.st3onev";
  }
  if (e instanceof Error) {
    if (e.message === "UNKNOWN_LEGAL_DOCUMENT") return "Unknown legal document.";
    if (e.message === "LEGAL_DOCUMENT_EMPTY") return "Title and body are required.";
  }
  return e instanceof Error ? e.message : "actions.s1su4v2o";
}

export async function adminListLegalDocuments() {
  try {
    await requireAdminPermission("settings", { action: "LEGAL_DOCUMENT_LIST" });
    return { ok: true as const, data: await listLegalEditorSummaries() };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminLoadLegalDocument(slug: string) {
  try {
    await requireAdminPermission("settings", {
      action: "LEGAL_DOCUMENT_VIEW",
      targetType: "legal",
      targetId: slug,
    });
    const data = await getLegalEditorPayload(slug);
    if (!data) return { ok: false as const, error: "Unknown legal document." };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminPublishLegalDocument(input: {
  slug: string;
  title: string;
  intro: string;
  bodyText: string;
  mode: "immediate" | "schedule30";
}) {
  try {
    const actor = await requireAdminStepUp("settings", {
      action:
        input.mode === "immediate" ? "LEGAL_DOCUMENT_PUBLISH" : "LEGAL_DOCUMENT_SCHEDULE",
      targetType: "legal",
      targetId: input.slug,
    });
    const result = await saveLegalDocument({
      slug: input.slug,
      title: input.title,
      intro: input.intro,
      bodyText: input.bodyText,
      mode: input.mode,
      actorId: actor.id,
    });
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminCancelScheduledLegalDocument(slug: string) {
  try {
    await requireAdminStepUp("settings", {
      action: "LEGAL_DOCUMENT_SCHEDULE_CANCEL",
      targetType: "legal",
      targetId: slug,
    });
    await cancelScheduledLegalDocument(slug);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
