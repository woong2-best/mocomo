import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { getMyCreatorStudio } from "@/lib/creator-studio";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { StudioEditorForm } from "@/components/used/studio-editor-form";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default async function MarketDigitalSellPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/market/new/digital");
  const { t } = await getServerTranslator();
  let studio: Awaited<ReturnType<typeof getMyCreatorStudio>> = null;
  try {
    studio = await getMyCreatorStudio(user.id);
  } catch (err) {
    const digest =
      err && typeof err === "object" && "digest" in err ? String((err as { digest?: string }).digest) : "";
    if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")) throw err;
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
      <h1 className="text-xl font-extrabold">{t("market.studio.editor")}</h1>
      <StudioEditorForm
        initial={
          studio
            ? {
                category: studio.category,
                title: studio.title,
                about: studio.about,
                open: studio.open,
                slotCap: studio.slotCap,
                deliveryDays: studio.deliveryDays,
                revisionNote: studio.revisionNote,
                currency: studio.currency,
                portfolio: studio.portfolio,
                tiers: studio.tiers,
                addons: studio.addons,
                formFields: studio.formFields,
              }
            : null
        }
      />
    </AppPageChrome>
  );
}
