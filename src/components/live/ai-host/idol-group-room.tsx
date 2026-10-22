"use client";

import { usePathname, useRouter } from "next/navigation";
import { MocoLiveRoom } from "@/components/live/ai-host/moco-live-room";
import { useLocale } from "@/components/providers/locale-provider";
import { IDOLS, type IdolId } from "@/lib/ai-live/idols";

export function IdolGroupRoom({ channels }: { channels: Partial<Record<IdolId, string>> }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const idol = IDOLS.find((item) => pathname === `/live/${item.id}`) ?? IDOLS[0];

  const select = (id: IdolId) => {
    if (id === idol.id) return;
    router.replace(`/live/${id}`);
  };

  return (
    <MocoLiveRoom
      channelId={channels[idol.id] ?? null}
      vrmUrl={idol.vrmUrl}
      hostNameKey={idol.nameKey}
      titleKey={idol.titleKey}
      subKey={idol.roleKey}
      memberId={idol.id}
      donationPoll={`/api/live/idol/${idol.id}/donations`}
      signInPath={`/live/${idol.id}`}
      poster={false}
      accent={idol.accent}
      tabs={IDOLS.map((item) => ({
        id: item.id,
        label: t(item.nameKey),
        active: item.id === idol.id,
        onSelect: () => select(item.id),
      }))}
    />
  );
}
