import { hasWebtoonAccess } from "@/actions/webtoon";
import { WebtoonShell } from "@/components/webtoon/webtoon-shell";
import { WebtoonLayoutChrome } from "@/components/layout/section-layout-chrome";

export default async function WebtoonLayout({ children }: { children: React.ReactNode }) {
  const hasAccess = await hasWebtoonAccess();

  return (
    <WebtoonShell hasAccess={hasAccess}>
      <WebtoonLayoutChrome>{children}</WebtoonLayoutChrome>
    </WebtoonShell>
  );
}
