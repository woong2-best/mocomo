import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Radio, Users, Gem, Camera, Tv, PenSquare, ShoppingBag } from "lucide-react";
import { BRAND } from "@/lib/brand";

const features = [
  { icon: PenSquare, label: "SNS 피드", href: "/explore" },
  { icon: Tv, label: "애니덕질", href: "/anime" },
  { icon: Camera, label: "코스프레", href: "/cosplay" },
  { icon: ShoppingBag, label: "굿즈", href: "/market" },
  { icon: Radio, label: "라이브", href: "/live" },
  { icon: Users, label: "커뮤니티", href: "/communities" },
  { icon: Gem, label: "후원", href: "/support" },
];

export function HomeGuestHero() {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-pink-500/10 to-cyan-500/10 p-6 sm:p-8 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold">{BRAND.name}에 오신 것을 환영합니다</h1>
      <p className="text-muted-foreground mt-2 max-w-lg">
        {BRAND.description}. 가입 후 글 작성, 라이브, DM을 이용할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        <Button asChild size="lg" className="rounded-xl">
          <Link href="/auth/signup">무료 회원가입</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl">
          <Link href="/auth/signin">로그인</Link>
        </Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-8">
        {features.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-background/60 py-3 px-2 text-xs hover:border-primary/40 transition-colors"
          >
            <Icon className="h-5 w-5 text-primary" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
