import type { ReactNode } from "react";
import { Radio } from "lucide-react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { LiveRoomErrorState } from "@/components/live/live-room-error-state";

/** 자체 송출 종료 / 라이브 전체 비활성 안내 (코드 삭제 없음) */
export function LiveFeatureDisabledNotice({
  title = "자체 송출이 종료되었습니다",
  description,
}: {
  title?: string;
  description?: ReactNode;
} = {}) {
  return (
    <LiveRoomErrorState
      title={title}
      description={
        description ?? (
          <>
            MoCoMo 서버로 직접 송출하던 방송은 종료되었습니다.
            <br />
            유튜브·트위치 등 외부 방송을 연결하는 방식으로 전환 중입니다.
            <br />
            채팅·후원은 MoCoMo에서 계속 이용할 수 있습니다.
          </>
        )
      }
      icon={Radio}
      variant="muted"
      primaryHref={DEFAULT_LANDING_PATH}
      primaryLabel="홈으로"
      secondaryHref="/live/external/new"
      secondaryLabel="외부 방송 연결"
    />
  );
}
