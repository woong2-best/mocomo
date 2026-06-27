import { redirect } from "next/navigation";

export const metadata = {
  title: "2D 아바타 편집 | MoCoMo",
  description: "MoCoMo는 2D 아바타 편집기를 기본 스튜디오로 사용합니다.",
};

export default async function Avatar3dStudioPage() {
  redirect("/avatar/studio/2d");
}
