"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Menu,
  Pencil,
  Radio,
  Settings,
  ShoppingBag,
  Star,
  Tv,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccountSwitcherDialog } from "@/components/auth/account-switcher-dialog";
import { ProfileFollowListDialog } from "@/components/profile/profile-follow-list-dialog";
import { ProfileBannerMedia } from "@/components/profile/profile-banner-media";
import { getDrawerProfile } from "@/actions/drawer-profile";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useLocale } from "@/components/providers/locale-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion-presets";
import type { MessageKey } from "@/lib/i18n/messages";
import type { MapEventPin } from "@/lib/subculture-events";

const SidebarEventMapCard = dynamic(
  () => import("@/components/events/sidebar-event-map-card").then((m) => m.SidebarEventMapCard),
  { ssr: false }
);

const EXPLORE_ACCENT = "#8B5CF6";
const PANEL_WIDTH = "min(86vw, 360px)";

type ExploreItem = {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  accent?: boolean;
  liveOnly?: boolean;
};

const EXPLORE: ExploreItem[] = [
  { href: "/market", labelKey: "nav.market", icon: ShoppingBag, accent: true },
  { href: "/live", labelKey: "nav.live", icon: Radio, accent: true, liveOnly: true },
  { href: "/star", labelKey: "nav.star", icon: Star },
  { href: "/communities", labelKey: "nav.communities", icon: Users },
  { href: "/anime", labelKey: "nav.anime", icon: BookOpen },
  { href: "/wallet", labelKey: "nav.wallet", icon: Wallet },
  { href: "/live/studio", labelKey: "nav.liveStudio", icon: Tv, accent: true },
];

type MobileDrawerNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DrawerProfile = {
  bannerUrl: string | null;
  bannerVideoUrl: string | null;
  following: number;
  followers: number;
};

export function MobileDrawerNav({ open, onOpenChange }: MobileDrawerNavProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { session, authenticated } = useAuthReady();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following" | null>(null);
  const [profile, setProfile] = useState<DrawerProfile | null>(null);
  const [mapPins, setMapPins] = useState<MapEventPin[]>([]);
  const username = session?.user?.username;
  const displayName = session?.user?.name || username || "MoCoMo";

  const items = EXPLORE.filter((item) => !item.liveOnly || isLiveFeatureEnabled());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setSwitcherOpen(false);
      setFollowTab(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !username) return;
    let cancelled = false;
    void getDrawerProfile(username)
      .then((header) => {
        if (cancelled || !header) return;
        setProfile(header);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, username]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/events/map?global=1")
      .then((res) => res.json())
      .then((data: { pins?: MapEventPin[] }) => {
        if (!cancelled) setMapPins(Array.isArray(data.pins) ? data.pins : []);
      })
      .catch(() => {
        if (!cancelled) setMapPins([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = () => onOpenChange(false);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const drawer =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={t("ui.close_menu")}
              className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-md"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.22 }}
              onClick={close}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={t("ui.side_menu")}
              className="fixed inset-y-0 left-0 z-[401] flex flex-col bg-background px-4 dark:bg-[#0F1524]"
              style={{
                width: PANEL_WIDTH,
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
              }}
              initial={reduced ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: "-100%" }}
              transition={reduced ? { duration: 0 } : springSnappy}
            >
              <div className="flex min-h-0 flex-1 flex-col justify-between">
                <div className="relative mb-2.5 aspect-[3/1] w-full shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted dark:border-white/20 dark:bg-[#141820]">
                  <ProfileBannerMedia
                    bannerUrl={profile?.bannerUrl}
                    bannerVideoUrl={profile?.bannerVideoUrl}
                    active={open && !switcherOpen}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/38" />
                  {authenticated ? (
                    <div className="absolute right-3 top-3 z-20 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => go("/settings/profile")}
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/25 bg-black/30 text-white"
                        aria-label={t("settings.editProfile")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => go("/settings")}
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/25 bg-black/30 text-white"
                        aria-label={t("nav.settings")}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="absolute inset-0 z-10 flex flex-col justify-center px-4 pb-8">
                    {authenticated && username ? (
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-3 text-left"
                        onClick={() => setSwitcherOpen(true)}
                        aria-label={t("accountSwitch.title")}
                      >
                        <Avatar className="h-[52px] w-[52px] shrink-0">
                          <AvatarImage src={session?.user?.image ?? undefined} />
                          <AvatarFallback>{displayName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate text-lg font-extrabold text-white">
                            {displayName}
                          </span>
                          <span className="mt-0.5 block truncate text-[13px] font-semibold text-white/70">
                            @{username}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-left text-sm font-bold text-white"
                        onClick={() => go("/auth/signin")}
                      >
                        {t("common.signIn")}
                      </button>
                    )}
                  </div>

                  {authenticated && username ? (
                    <div className="absolute inset-x-0 bottom-0 z-20 flex gap-4 px-4 pb-3 text-[13px] font-semibold text-white/80">
                      <button
                        type="button"
                        onClick={() => setFollowTab("following")}
                        aria-label={`${profile?.following ?? 0} ${t("lib.user.connections.s44bb989270")}`}
                      >
                        <span className="font-extrabold text-white">{profile?.following ?? 0}</span>{" "}
                        {t("lib.user.connections.s44bb989270")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowTab("followers")}
                        aria-label={`${profile?.followers ?? 0} ${t("lib.user.connections.s88942fcf78")}`}
                      >
                        <span className="font-extrabold text-white">{profile?.followers ?? 0}</span>{" "}
                        {t("lib.user.connections.s88942fcf78")}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0">
                  <p className="mb-1 text-[13px] font-bold tracking-wide text-muted-foreground">
                    {t("nav.explore")}
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <PrefetchLink
                        key={item.href}
                        href={item.href}
                        onClick={close}
                        className={cn(
                          "flex h-[42px] items-center gap-1 px-0.5",
                          active && "opacity-90"
                        )}
                      >
                        <Icon
                          className="h-[22px] w-7 shrink-0"
                          style={{ color: item.accent ? EXPLORE_ACCENT : undefined }}
                          strokeWidth={1.8}
                        />
                        <span
                          className="flex-1 truncate text-base font-bold"
                          style={{ color: item.accent ? EXPLORE_ACCENT : undefined }}
                        >
                          {t(item.labelKey)}
                        </span>
                        <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
                      </PrefetchLink>
                    );
                  })}
                </div>

                <div className="relative mt-2 min-h-[140px] flex-1 overflow-hidden">
                  {open ? <SidebarEventMapCard pins={mapPins} fillHeight /> : null}
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      {drawer}
      <AccountSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
      {username ? (
        <ProfileFollowListDialog
          open={followTab !== null}
          onOpenChange={(next) => {
            if (!next) setFollowTab(null);
          }}
          username={username}
          tab={followTab ?? "followers"}
        />
      ) : null}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="lg:hidden h-10 w-10 rounded-full shrink-0"
      onClick={onClick}
      aria-label={t("ui.open_menu")}
    >
      <Menu className="h-6 w-6" strokeWidth={2} />
      <span className="sr-only">{t("common.menu")}</span>
    </Button>
  );
}
