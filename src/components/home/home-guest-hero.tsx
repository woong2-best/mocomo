"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Radio, Users, Gem, Camera, Tv, PenSquare } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
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
      <FolkSectionTitle className="mb-3">
        {t("home.welcome", { brand: BRAND.name })}
      </FolkSectionTitle>
      <p className="text-muted-foreground mt-3 max-w-lg font-medium leading-relaxed">
        {t("home.guestDescription", { description: t("brand.description") })}
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        <Button asChild size="lg" className="rounded-xl shadow-folk">
          <Link href="/auth/signup">{t("home.signUpFree")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl border-2 border-folk-cobalt/40">
          <Link href="/auth/signin">{t("nav.signin")}</Link>
        </Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-6">
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
