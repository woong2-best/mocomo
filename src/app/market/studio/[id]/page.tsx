import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioOrderForm } from "@/components/used/studio-order-form";
import { auth } from "@/lib/auth";
import { getCreatorStudio } from "@/lib/creator-studio";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const studio = await getCreatorStudio(id);
  if (!studio) notFound();
  const session = await auth();
  const owner = session?.user?.id === studio.sellerId;
  const cover = studio.portfolio.filter((item) => item.kind !== "video");

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {studio.portfolio.map((item) =>
          item.kind === "video" ? (
            <video key={item.url} src={item.url} className="aspect-square w-full rounded-xl bg-black object-cover" controls muted playsInline />
          ) : (
            <img key={item.url} src={item.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
          )
        )}
      </div>
      <div>
        <h1 className="text-2xl font-extrabold">{studio.title}</h1>
        <p className="text-sm text-muted-foreground">@{studio.seller.username}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{studio.about}</p>
        <p className={`mt-2 text-sm font-extrabold ${studio.accepting ? "text-emerald-500" : "text-folk-terracotta"}`}>
          {studio.accepting ? t("market.studio.open") : t("market.studio.closed")} {studio.slotsUsed}/{studio.slotCap}
        </p>
      </div>
      {owner ? (
        <p className="text-sm text-muted-foreground">{t("market.studio.rules")}</p>
      ) : (
        <StudioOrderForm
          studio={{
            id: studio.id,
            accepting: studio.accepting,
            currency: studio.currency,
            tiers: studio.tiers,
            addons: studio.addons,
            formFields: studio.formFields,
            deliveryDays: studio.deliveryDays,
            revisionNote: studio.revisionNote,
          }}
          labels={{
            tiers: t("market.studio.tiers"),
            addons: t("market.studio.addons"),
            rules: t("market.studio.rules"),
            days: t("market.studio.days"),
            form: t("market.studio.form"),
            agree: t("market.studio.agree"),
            order: t("market.studio.order"),
            waitlist: t("market.studio.waitlist"),
          }}
        />
      )}
      {cover.length === 0 ? null : (
        <Link href="/market?track=digital" className="text-sm font-bold text-folk-cobalt">
          {t("market.scope.digital")}
        </Link>
      )}
    </div>
  );
}
