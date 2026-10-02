import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WebtoonDrawStudio } from "@/components/webtoon-studio/webtoon-draw-studio";

export const metadata = {
  title: "Drawing Studio | MoCoMo",
  description: "Illustration tools · layers & brushes · cloud save",
};

export default async function WebtoonDrawStudioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/webtoon/studio/draw");

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">
        웹툰 연재 원고 · 레이어 · 브러시 · 클라우드 저장 · 대사 스크립트 · 다중 페이지
      </p>
      <WebtoonDrawStudio />
    </div>
  );
}
