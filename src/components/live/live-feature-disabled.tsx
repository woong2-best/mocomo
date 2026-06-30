import { Radio } from "lucide-react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { LiveRoomErrorState } from "@/components/live/live-room-error-state";

/** 라이브 기능 비활성 시 안내 (코드 삭제 없음) */
export function LiveFeatureDisabledNotice() {
  return (
    <LiveRoomErrorState
      title="라이브 방송 준비 중"
      description={
        <>
          라이브 방송 기능은 일시적으로 점검 중입니다.
          <br />
          다른 서비스는 그대로 이용할 수 있습니다.
        </>
      }
      icon={Radio}
      variant="muted"
      primaryHref={DEFAULT_LANDING_PATH}
      primaryLabel="홈으로"
    />
  );
}
