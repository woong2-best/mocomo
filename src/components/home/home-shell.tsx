import { getCachedSession } from "@/lib/auth";
import { HomeStaticSection } from "@/components/home/home-static-section";

/** DB 대기 없이 바로 그리는 홈 상단 */
export async function HomeShell() {
  try {
    const session = await getCachedSession();
    return <HomeStaticSection isLoggedIn={!!session?.user} />;
  } catch {
    return <HomeStaticSection isLoggedIn={false} />;
  }
}
