"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  tabLabel: string;
  accent: string;
  panelClass: string;
};

const SLIDES: HeroSlide[] = [
  {
    id: "custom",
    eyebrow: "주문제작 OPEN",
    title: "코스프레·소품\n맞춤 제작",
    subtitle: "제작 일수·견적을 확인하고 크리에이터에게 바로 주문하세요.",
    cta: "주문제작 둘러보기",
    href: "/market?type=CUSTOM_ORDER",
    tabLabel: "주문제작",
    accent: "from-folk-terracotta/90 to-folk-cobalt/80",
    panelClass:
      "bg-[radial-gradient(ellipse_at_20%_20%,hsl(var(--folk-gold)/0.35),transparent_50%),linear-gradient(135deg,hsl(var(--folk-cream)),hsl(28_40%_92%))]",
  },
  {
    id: "digital",
    eyebrow: "디지털 에셋",
    title: "브러시·PSD\n바로 다운로드",
    subtitle: "결제 후 즉시 받는 디지털 상품. 일러스트·3D·음원까지.",
    cta: "디지털 상품 보기",
    href: "/market?type=DIGITAL",
    tabLabel: "디지털",
    accent: "from-folk-cobalt/90 to-violet-800/80",
    panelClass:
      "bg-[radial-gradient(ellipse_at_80%_10%,hsl(var(--folk-cobalt)/0.18),transparent_45%),linear-gradient(145deg,#f7f4ee,#e8eef8)]",
  },
  {
    id: "preorder",
    eyebrow: "예약판매",
    title: "한정 굿즈\n미리 확보",
    subtitle: "예약 오픈 상품을 먼저 잡고, 발송 일정을 추적하세요.",
    cta: "예약판매 보기",
    href: "/market?type=PREORDER",
    tabLabel: "예약판매",
    accent: "from-amber-600/90 to-folk-terracotta/80",
    panelClass:
      "bg-[radial-gradient(ellipse_at_60%_80%,hsl(var(--folk-gold)/0.4),transparent_50%),linear-gradient(160deg,#faf6ef,#f3e8d8)]",
  },
  {
    id: "seller",
    eyebrow: "판매자 온보딩",
    title: `글로벌 ${MARKET_BRAND_NAME}\n판매 시작`,
    subtitle: "한국 SMS · 해외 Stripe 경로로 판매자 등록을 완료하세요.",
    cta: "판매자 등록",
    href: "/market/seller/register",
    tabLabel: "판매 시작",
    accent: "from-folk-forest/90 to-folk-cobalt/75",
    panelClass:
      "bg-[radial-gradient(ellipse_at_30%_70%,hsl(var(--folk-forest)/0.2),transparent_50%),linear-gradient(135deg,#f3f6f1,#e8efe6)]",
  },
];

export function MarketHeroShowcase({ className }: { className?: string }) {
  const [active, setActive] = useState(0);
  const slide = SLIDES[active] ?? SLIDES[0];

  return (
    <section
      className={cn(
        "grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-0 overflow-hidden rounded-2xl border-2 border-folk-cobalt/25 bg-background shadow-[4px_5px_0_hsl(var(--folk-cobalt)/0.1)]",
        className
      )}
    >
      <Link
        href={slide.href}
        className={cn(
          "relative min-h-[220px] sm:min-h-[280px] lg:min-h-[300px] p-6 sm:p-8 flex flex-col justify-between overflow-hidden group",
          slide.panelClass
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition-opacity group-hover:opacity-60",
            slide.accent
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute -bottom-16 right-8 h-48 w-48 rounded-full bg-gradient-to-tr opacity-30 blur-3xl",
            slide.accent
          )}
        />

        <div className="relative z-[1] space-y-3 max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-folk-cobalt/20 bg-background/80 px-2.5 py-1 text-[11px] font-bold text-folk-cobalt backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-folk-terracotta" />
            {slide.eyebrow}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] text-foreground whitespace-pre-line tracking-tight">
            {slide.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {slide.subtitle}
          </p>
        </div>

        <span className="relative z-[1] mt-6 inline-flex w-fit items-center gap-1.5 rounded-xl bg-folk-terracotta px-4 py-2.5 text-sm font-bold text-white shadow-[2px_3px_0_hsl(var(--folk-cobalt)/0.2)] group-hover:brightness-110 transition-all">
          {slide.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <ul className="flex lg:flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-folk-cobalt/15 overflow-x-auto lg:overflow-visible scrollbar-none">
        {SLIDES.map((s, i) => {
          const selected = i === active;
          return (
            <li key={s.id} className="flex-1 min-w-[7.5rem] lg:min-w-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "w-full h-full text-left px-3.5 py-3.5 sm:py-4 border-r lg:border-r-0 lg:border-b border-folk-cobalt/10 last:border-0 transition-colors",
                  selected
                    ? "bg-folk-cream border-l-[3px] border-l-folk-terracotta lg:border-l-[3px]"
                    : "bg-background hover:bg-muted/40 border-l-[3px] border-l-transparent"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-bold truncate",
                    selected ? "text-folk-terracotta" : "text-foreground"
                  )}
                >
                  {s.tabLabel}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                  {s.eyebrow}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
