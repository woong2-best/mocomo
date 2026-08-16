import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LEGAL_DMCA_AGENT_EMAIL } from "@/lib/legal-content";

export function CultureWikiEditNotice() {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm font-semibold text-foreground">편집 전 확인사항</p>
      </div>
      <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
        <li>컬쳐 위키의 모든 글은 CC BY-NC-SA 4.0 라이선스로 공유됩니다.</li>
        <li>
          타인의 저작권을 침해하거나 명예훼손, 불법 정보를 포함한 게시물 작성 시 법적 책임은 작성자 본인에게
          있습니다.
        </li>
        <li>
          저작권 침해 신고 및 삭제 요청:{" "}
          <a href={`mailto:${LEGAL_DMCA_AGENT_EMAIL}`} className="text-primary hover:underline">
            {LEGAL_DMCA_AGENT_EMAIL}
          </a>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        자세한 내용은{" "}
        <Link href="/legal/culture-wiki" className="text-primary hover:underline">
          컬쳐 위키 이용 약관 및 저작권 정책
        </Link>
        을 확인해 주세요.
      </p>
    </div>
  );
}
