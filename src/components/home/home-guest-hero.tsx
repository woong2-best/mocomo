"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Radio, Users, Gem, Camera, Tv, PenSquare } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { FolkBrushDivider, FolkSectionTitle } from "@/components/brand/folk-decor";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const features: { icon: typeof PenSquare; labelKey: MessageKey; href: string }[] = [
  { icon: PenSquare, labelKey: "home.featureFeed", href: "/explore" },
  { icon: Tv, labelKey: "home.featureAnime", href: "/anime" },
  { icon: Camera, labelKey: "home.featureCosplay", href: "/cosplay" },
  { icon: Gem, labelKey: "home.featureSupport", href: "/support" },
  { icon: Radio, labelKey: "home.featureLive", href: "/live" },
  { icon: Users, labelKey: "home.featureCommunities", href: "/communities" },
];

export function HomeGuestHero() {
  const { t } = useLocale();

  return (
    <div className="folk-hero-banner">
      <FolkSectionTitle icon="sun" className="relative z-10 mb-3">
        {t("home.welcome", { brand: BRAND.name })}
      </FolkSectionTitle>
      <p className="text-folk-forest/90 mt-3 max-w-lg relative z-10 font-medium leading-relaxed">
        {t("home.guestDescription", { description: t("brand.description") })}
      </p>
      <div className="flex flex-wrap gap-3 mt-6 relative z-10">
        <Button asChild size="lg" className="rounded-xl shadow-folk">
          <Link href="/auth/signup">{t("home.signUpFree")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl border-2 border-folk-cobalt/40">
          <Link href="/auth/signin">{t("nav.signin")}</Link>
        </Button>
      </div>
      <FolkBrushDivider className="my-6 relative z-10 opacity-70" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 relative z-10">
        {features
          .filter(({ href }) => isLiveFeatureEnabled() || !isLiveNavHref(href))
          .map(({ icon: Icon, labelKey, href }) => (
            <Link key={href} href={href} className="folk-nav-tile">
              <Icon className="h-5 w-5 text-folk-terracotta" />
              {t(labelKey)}
            </Link>
          ))}
      </div>
    </div>
  );
}
