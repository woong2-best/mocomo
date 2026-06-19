import Link from "next/link";
import { auth } from "@/lib/auth";
import { listPublishedAssets } from "@/studio/actions/market";
import { AssetCard } from "@/studio/components/asset-card";
import { getMocomoSignInUrl, getStudioBaseUrl } from "@/studio/lib/host";
import { Button } from "@/components/ui/button";

export default async function StudioHomePage() {
  const session = await auth();
  const featured = await listPublishedAssets({ take: 8 });

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-violet-50 p-8 md:p-12">
        <p className="text-sm font-medium text-pink-500">제작 공간 · MoCoMo와 독립</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-pink-700 md:text-5xl">
          Bondee 스타일 3D를
          <br />
          직접 만들고 팔아요
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          가구·장식·아바타 의상을 업로드하고, 검수 후 MoCoMo APT에서 사용할 수 있게 배포하세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {session?.user ? (
            <>
              <Button asChild>
                <Link href="/studio/create">자산 만들기</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/studio/market">마켓 둘러보기</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <a href={getMocomoSignInUrl(getStudioBaseUrl())}>MoCoMo 계정으로 시작</a>
            </Button>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">최신 배포 자산</h2>
          <Link href="/studio/market" className="text-sm text-pink-600 hover:underline">
            전체 보기
          </Link>
        </div>
        {featured.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((a) => (
              <AssetCard key={a.id} asset={a} href={`/studio/market/${a.id}`} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-pink-200 p-8 text-center text-muted-foreground">
            아직 배포된 자산이 없습니다. 첫 크리에이터가 되어 보세요!
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Asset Creator", desc: "GLB/GLTF 업로드 · 3D 미리보기 · 자동 검사" },
          { title: "Marketplace", desc: "무료·유료 배포 · 카테고리·태그" },
          { title: "Creator Hub", desc: "전용 페이지 · 팔로워 · 수익 출금" },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-pink-100 bg-white p-5">
            <h3 className="font-semibold text-pink-700">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
