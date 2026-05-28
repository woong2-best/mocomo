import Link from "next/link";
import { HomeGuestHero } from "@/components/home/home-guest-hero";
import { Button } from "@/components/ui/button";

/** DB 없어도 항상 보이는 홈 상단 (정적) — 광고는 피드 중간에만 표시 */
export function HomeStaticSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      {!isLoggedIn && <HomeGuestHero />}

      {!isLoggedIn && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center space-y-4 mb-6">
          <p className="text-lg font-bold">3초면 가입 끝</p>
          <p className="text-sm text-muted-foreground">이메일 · Google · Discord 로 시작</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl px-8">
              <Link href="/auth/signup">무료 회원가입</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-8">
              <Link href="/auth/signin">로그인</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
