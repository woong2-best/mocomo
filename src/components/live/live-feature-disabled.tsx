import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";

/** 라이브 기능 비활성 시 안내 (코드 삭제 없음) */
export function LiveFeatureDisabledNotice() {
  return (
    <div className="live-page-shell max-w-lg mx-auto p-8 text-center space-y-4">
      <Radio className="h-12 w-12 mx-auto text-muted-foreground opacity-60" />
      <h1 className="text-xl font-bold">라이브 방송 준비 중</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        OBS·라이브 방송 기능은 일시적으로 점검 중입니다.
        <br />
        다른 서비스는 그대로 이용할 수 있습니다.
      </p>
      <Button asChild className="rounded-xl">
        <Link href="/">홈으로</Link>
      </Button>
    </div>
  );
}
