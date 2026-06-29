import Link from "next/link";
import { auth, isSiteOperator } from "@/lib/auth";
import { getAnimeDeleteRequests } from "@/actions/anime";
import { AnimeDeleteRequestsAdmin } from "@/components/anime/anime-delete-requests-admin";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { UserRole } from "@prisma/client";

export default async function AnimeDeleteRequestsPage() {
  const session = await auth();
  const isAdmin =
    !!session?.user &&
    (session.user.role === UserRole.ADMIN ||
      session.user.role === UserRole.MODERATOR ||
      (session.user.username
        ? isSiteOperator(session.user as { username: string; role: string; email?: string | null })
        : false));

  let pending: Awaited<ReturnType<typeof getAnimeDeleteRequests>> = [];
  if (isAdmin) {
    try {
      pending = await getAnimeDeleteRequests();
    } catch {
      pending = [];
    }
  }

  return (
    <AppPageChrome maxWidth="2xl">
      <NativePageTitle>
        <div>
          <h1 className="text-xl font-bold">삭제 요청</h1>
          <p className="text-sm text-muted-foreground mt-1">
            위키 문서 삭제 요청은 운영진 검토 후 처리됩니다. 문서 하단 편집 메뉴에서 요청할 수 있습니다.
          </p>
        </div>
      </NativePageTitle>

      {isAdmin ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">운영진 · 대기 목록</h2>
          <AnimeDeleteRequestsAdmin requests={pending} />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          삭제를 요청하려면 해당{" "}
          <Link href="/anime" className="text-primary underline">
            위키 문서
          </Link>
          의 편집 페이지 하단을 이용해 주세요.
        </p>
      )}

      <Link href="/anime" className="text-sm text-primary hover:underline inline-block">
        ← 애니 위키로
      </Link>
    </AppPageChrome>
  );
}
