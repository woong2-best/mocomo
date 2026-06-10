import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WebtoonDrawStudio } from "@/components/webtoon-studio/webtoon-draw-studio";

export const metadata = {
  title: "웹툰 드로잉 스튜디오 | MoCoMo",
  description: "웹툰 전용 레이어·브러시·만화 도구 · 연재 원고 제작",
};

export default async function WebtoonDrawStudioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/webtoon/studio/draw");

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">
        웹툰 연재 원고 · 레이어 · 브러시 · 말풍선 · 속도선 · 다중 페이지 · 자동 저장(로컬)
      </p>
      <WebtoonDrawStudio />
    </div>
  );
}
