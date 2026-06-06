import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Radio, Users, Gem, Camera, Tv, PenSquare } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { FolkBrushDivider, FolkSectionTitle } from "@/components/brand/folk-decor";

const features = [
  { icon: PenSquare, label: "SNS 피드", href: "/explore" },
  { icon: Tv, label: "애니덕질", href: "/anime" },
  { icon: Camera, label: "코스프레", href: "/cosplay" },
  { icon: Gem, label: "후원", href: "/support" },
  { icon: Radio, label: "라이브", href: "/live" },
  { icon: Users, label: "커뮤니티", href: "/communities" },
];

export function HomeGuestHero() {
  return (
    <div className="folk-hero-banner">
      <FolkSectionTitle icon="sun" className="relative z-10 mb-3">
        {BRAND.name}에 오신 것을 환영합니다
      </FolkSectionTitle>
      <p className="text-folk-forest/90 mt-3 max-w-lg relative z-10 font-medium leading-relaxed">
        {BRAND.description}. 붓끝으로 그린 듯한 서브컬처 이야기 — 가입 후 글·DM·통화를 즐겨 보세요.
      </p>
      <div className="flex flex-wrap gap-3 mt-6 relative z-10">
        <Button asChild size="lg" className="rounded-xl shadow-folk">
          <Link href="/auth/signup">무료 회원가입</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl border-2 border-folk-cobalt/40">
          <Link href="/auth/signin">로그인</Link>
        </Button>
      </div>
      <FolkBrushDivider className="my-6 relative z-10 opacity-70" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 relative z-10">
        {features
          .filter(({ href }) => isLiveFeatureEnabled() || !isLiveNavHref(href))
          .map(({ icon: Icon, label, href }) => (
            <Link key={href} href={href} className="folk-nav-tile">
              <Icon className="h-5 w-5 text-folk-terracotta" />
              {label}
            </Link>
          ))}
      </div>
    </div>
  );
}
