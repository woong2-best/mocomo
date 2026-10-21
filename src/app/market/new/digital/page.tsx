import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser, getCachedSession } from "@/lib/auth";
import { getMyCreatorStudio } from "@/lib/creator-studio";
import { studioCategoryGroups } from "@/lib/creator-studio-categories";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { StudioEditorForm } from "@/components/used/studio-editor-form";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import type { StudioDraft } from "@/lib/studio-editor-validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOGIN_PATH = "/auth/login?redirect=/market/new/digital";

function isNextControlFlow(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const digest = "digest" in err ? String((err as { digest?: unknown }).digest ?? "") : "";
  const message = err instanceof Error ? err.message : "";
  return digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE" || message.includes("Dynamic server usage");
}

function logDigitalRouteError(scope: string, err: unknown) {
  const error = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Unknown error");
  console.error(`[market/new/digital] ${scope}`, error.stack ?? error.message);
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export default async function MarketDigitalSellPage() {
  let session: Awaited<ReturnType<typeof getCachedSession>> = null;
  try {
    session = await getCachedSession();
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    logDigitalRouteError("session", err);
    session = null;
  }

  if (session === null || !session.user?.id) {
    redirect(LOGIN_PATH);
  }

  const sellerId = session.user.id;
  if (!sellerId) redirect(LOGIN_PATH);
  let categories: ReturnType<typeof studioCategoryGroups> = [];
  let initial: StudioDraft | null = null;
  let title = "Studio";

  try {
    const user = await getCachedCurrentUser();
    if (!user) redirect(LOGIN_PATH);

    try {
      const { t } = await getServerTranslator();
      title = t("market.studio.editor");
    } catch (err) {
      if (isNextControlFlow(err)) throw err;
      logDigitalRouteError("i18n", err);
    }

    try {
      categories = studioCategoryGroups() ?? [];
    } catch (err) {
      if (isNextControlFlow(err)) throw err;
      logDigitalRouteError("categories", err);
      categories = [];
    }

    let studio: Awaited<ReturnType<typeof getMyCreatorStudio>> = null;
    try {
      studio = await getMyCreatorStudio(user.id);
    } catch (err) {
      if (isNextControlFlow(err)) throw err;
      logDigitalRouteError("studio", err);
      studio = null;
    }

    initial = studio
      ? {
          category: studio.category ?? "",
          title: studio.title ?? "",
          about: studio.about ?? "",
          open: studio.open !== false,
          slotCap: Number.isFinite(studio.slotCap) ? studio.slotCap : 3,
          deliveryDays: Number.isFinite(studio.deliveryDays) ? studio.deliveryDays : 14,
          revisionNote: studio.revisionNote ?? "",
          currency: studio.currency || "moco",
          coverUrl: studio.coverUrl ?? "",
          blocks: asArray(studio.blocks),
          tiers: asArray(studio.tiers),
          addons: asArray(studio.addons),
          formFields: asArray(studio.formFields),
        }
      : null;
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    logDigitalRouteError("page", err);
    categories = [];
    initial = null;
  }

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/market/new"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {MARKET_BRAND_NAME}
      </Link>
      <h1 className="text-xl font-extrabold">{title}</h1>
      <StudioEditorForm initial={initial} categories={categories} sellerId={sellerId} />
    </AppPageChrome>
  );
}
