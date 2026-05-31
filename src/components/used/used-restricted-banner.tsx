import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { usedRestrictedLabel, isUsedRestrictedKind } from "@/lib/used-youth-protection";
import type { UsedRestrictedKind } from "@prisma/client";

export function UsedRestrictedBanner({
  restrictedKind,
  adultVerified,
  listingId,
}: {
  restrictedKind: UsedRestrictedKind | string;
  adultVerified: boolean;
  listingId: string;
}) {
  if (!isUsedRestrictedKind(restrictedKind)) return null;

  const label = usedRestrictedLabel(restrictedKind);
  const verifyHref = `/used/adult-verify?callbackUrl=${encodeURIComponent(`/used/${listingId}`)}&kind=${restrictedKind}`;

  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex gap-3">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm space-y-2 min-w-0">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          청소년 보호 · {label}
        </p>
        <p className="text-muted-foreground leading-relaxed">
          이 상품은 만 19세 이상 성인 인증 후 구매·입찰·거래 문의가 가능합니다.
        </p>
        {!adultVerified && (
          <Link
            href={verifyHref}
            className="inline-flex text-sm font-semibold text-primary underline underline-offset-2"
          >
            성인 인증하기
          </Link>
        )}
      </div>
    </div>
  );
}
