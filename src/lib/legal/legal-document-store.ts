import { revalidatePath } from "next/cache";
import type { LegalDocument } from "@/lib/legal-content";
import { LEGAL_PAGES } from "@/lib/legal-content";
import { db } from "@/lib/db";
import {
  editorFieldsToLegalDocument,
  legalDocumentToEditorFields,
} from "@/lib/legal/legal-document-text";
import {
  invalidateLatestTermsCache,
} from "@/lib/legal/terms-agreement";
import { TERMS_OF_SERVICE_REVIEW_PATH } from "@/lib/legal/terms-versions";

export const LEGAL_SCHEDULE_MS = 30 * 24 * 60 * 60 * 1000;

export type LegalCatalogItem = {
  slug: string;
  href: string;
  label: string;
  fallback: LegalDocument;
};

export function getLegalCatalog(): LegalCatalogItem[] {
  return LEGAL_PAGES.map((page) => ({
    slug: page.doc.slug,
    href: page.href,
    label: page.label,
    fallback: page.doc,
  }));
}

export function getLegalCatalogItem(slug: string): LegalCatalogItem | null {
  return getLegalCatalog().find((item) => item.slug === slug) ?? null;
}

export type ScheduledLegalNotice = {
  effectiveDate: string;
  title: string;
};

export type ResolvedLegalDocument = {
  document: LegalDocument;
  scheduledNotice: ScheduledLegalNotice | null;
};

function formatNoticeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function revisionToDocument(
  slug: string,
  row: {
    title: string;
    intro: string | null;
    bodyText: string;
    versionLabel: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    scheduledPublishAt: Date | null;
  },
  fallback: LegalDocument
): LegalDocument {
  return editorFieldsToLegalDocument({
    slug,
    title: row.title,
    intro: row.intro ?? "",
    bodyText: row.bodyText,
    updatedAt: formatNoticeDate(row.publishedAt ?? row.updatedAt),
    version: row.versionLabel ?? fallback.version,
  });
}

export async function applyDueLegalSchedules(): Promise<number> {
  const due = await db.legalDocumentRevision.findMany({
    where: {
      status: "SCHEDULED",
      scheduledPublishAt: { lte: new Date() },
    },
    orderBy: { scheduledPublishAt: "asc" },
  });
  for (const row of due) {
    await activateRevision(row.id, { triggerPopup: row.triggerTermsPopup });
  }
  return due.length;
}

async function activateRevision(
  id: string,
  opts: { triggerPopup: boolean }
): Promise<void> {
  const row = await db.legalDocumentRevision.findUnique({ where: { id } });
  if (!row || row.status !== "SCHEDULED") return;

  const claimed = await db.legalDocumentRevision.updateMany({
    where: { id: row.id, status: "SCHEDULED" },
    data: {
      status: "LIVE",
      publishedAt: new Date(),
      scheduledPublishAt: null,
    },
  });
  if (claimed.count === 0) return;

  await db.legalDocumentRevision.updateMany({
    where: { slug: row.slug, status: "LIVE", id: { not: row.id } },
    data: { status: "SUPERSEDED" },
  });

  if (opts.triggerPopup) {
    await publishRequiredTermsVersion(row.slug);
  }
  revalidateLegalPaths(row.slug);
}

export async function publishRequiredTermsVersion(slug: string): Promise<void> {
  const item = getLegalCatalogItem(slug);
  const termsUrl =
    slug === "terms" ? TERMS_OF_SERVICE_REVIEW_PATH : item?.href ?? TERMS_OF_SERVICE_REVIEW_PATH;
  const effectiveDate = new Date();
  const versionTag = `v${effectiveDate.toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36)}`;
  await db.termsVersion.create({
    data: {
      versionTag,
      effectiveDate,
      termsUrl,
    },
  });
  invalidateLatestTermsCache();
}

function revalidateLegalPaths(slug: string) {
  const item = getLegalCatalogItem(slug);
  revalidatePath("/legal");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  if (item) revalidatePath(item.href);
}

export async function resolvePublishedLegalDocument(
  slug: string,
  fallback: LegalDocument
): Promise<ResolvedLegalDocument> {
  try {
    await applyDueLegalSchedules();
    const [live, scheduled] = await Promise.all([
      db.legalDocumentRevision.findFirst({
        where: { slug, status: "LIVE" },
        orderBy: { publishedAt: "desc" },
      }),
      db.legalDocumentRevision.findFirst({
        where: { slug, status: "SCHEDULED" },
        orderBy: { scheduledPublishAt: "asc" },
      }),
    ]);

    const document = live ? revisionToDocument(slug, live, fallback) : fallback;
    const scheduledNotice =
      scheduled?.scheduledPublishAt != null
        ? {
            effectiveDate: formatNoticeDate(scheduled.scheduledPublishAt),
            title: scheduled.title,
          }
        : null;
    return { document, scheduledNotice };
  } catch {
    return { document: fallback, scheduledNotice: null };
  }
}

export type LegalEditorPayload = {
  slug: string;
  label: string;
  href: string;
  title: string;
  intro: string;
  bodyText: string;
  liveUpdatedAt: string | null;
  scheduledPublishAt: string | null;
};

export async function getLegalEditorPayload(slug: string): Promise<LegalEditorPayload | null> {
  const item = getLegalCatalogItem(slug);
  if (!item) return null;
  await applyDueLegalSchedules();
  const [live, scheduled] = await Promise.all([
    db.legalDocumentRevision.findFirst({
      where: { slug, status: "LIVE" },
      orderBy: { publishedAt: "desc" },
    }),
    db.legalDocumentRevision.findFirst({
      where: { slug, status: "SCHEDULED" },
      orderBy: { scheduledPublishAt: "asc" },
    }),
  ]);
  const editorSource = scheduled ?? live;
  const fields = editorSource
    ? { title: editorSource.title, intro: editorSource.intro ?? "", bodyText: editorSource.bodyText }
    : legalDocumentToEditorFields(item.fallback);
  return {
    slug,
    label: item.label,
    href: item.href,
    title: fields.title,
    intro: fields.intro,
    bodyText: fields.bodyText,
    liveUpdatedAt: live?.publishedAt?.toISOString() ?? null,
    scheduledPublishAt: scheduled?.scheduledPublishAt?.toISOString() ?? null,
  };
}

export async function listLegalEditorSummaries() {
  await applyDueLegalSchedules();
  const [liveRows, scheduledRows] = await Promise.all([
    db.legalDocumentRevision.findMany({
      where: { status: "LIVE" },
      orderBy: { publishedAt: "desc" },
    }),
    db.legalDocumentRevision.findMany({
      where: { status: "SCHEDULED" },
    }),
  ]);
  const liveBySlug = new Map(liveRows.map((row) => [row.slug, row]));
  const scheduledBySlug = new Map(scheduledRows.map((row) => [row.slug, row]));
  return getLegalCatalog().map((item) => ({
    slug: item.slug,
    href: item.href,
    label: item.label,
    liveUpdatedAt: liveBySlug.get(item.slug)?.publishedAt?.toISOString() ?? null,
    scheduledPublishAt: scheduledBySlug.get(item.slug)?.scheduledPublishAt?.toISOString() ?? null,
  }));
}

export async function saveLegalDocument(input: {
  slug: string;
  title: string;
  intro: string;
  bodyText: string;
  mode: "immediate" | "schedule30";
  actorId: string;
}): Promise<{ scheduledPublishAt: string | null }> {
  const item = getLegalCatalogItem(input.slug);
  if (!item) throw new Error("UNKNOWN_LEGAL_DOCUMENT");
  const title = input.title.trim();
  const bodyText = input.bodyText.trim();
  if (!title || !bodyText) throw new Error("LEGAL_DOCUMENT_EMPTY");

  const versionLabel = formatNoticeDate(new Date());
  if (input.mode === "immediate") {
    const created = await db.legalDocumentRevision.create({
      data: {
        slug: input.slug,
        title,
        intro: input.intro.trim() || null,
        bodyText,
        versionLabel,
        status: "LIVE",
        publishedAt: new Date(),
        triggerTermsPopup: false,
        createdById: input.actorId,
      },
    });
    await db.legalDocumentRevision.updateMany({
      where: {
        slug: input.slug,
        status: { in: ["LIVE", "SCHEDULED"] },
        id: { not: created.id },
      },
      data: { status: "SUPERSEDED" },
    });
    revalidateLegalPaths(input.slug);
    return { scheduledPublishAt: null };
  }

  const scheduledPublishAt = new Date(Date.now() + LEGAL_SCHEDULE_MS);
  await db.legalDocumentRevision.updateMany({
    where: { slug: input.slug, status: "SCHEDULED" },
    data: { status: "SUPERSEDED" },
  });
  await db.legalDocumentRevision.create({
    data: {
      slug: input.slug,
      title,
      intro: input.intro.trim() || null,
      bodyText,
      versionLabel,
      status: "SCHEDULED",
      scheduledPublishAt,
      triggerTermsPopup: true,
      createdById: input.actorId,
    },
  });
  revalidateLegalPaths(input.slug);
  return { scheduledPublishAt: scheduledPublishAt.toISOString() };
}

export async function cancelScheduledLegalDocument(slug: string): Promise<void> {
  await db.legalDocumentRevision.updateMany({
    where: { slug, status: "SCHEDULED" },
    data: { status: "SUPERSEDED" },
  });
  revalidateLegalPaths(slug);
}
