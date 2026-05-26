"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Trash2 } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import { adminForceDeletePost, adminForceDeleteUsedListing } from "@/actions/admin";
import { ReportButton } from "@/components/report/report-button";
import { Button } from "@/components/ui/button";

export function ContentModerationBar({
  targetType,
  targetId,
  reportedUserId,
  postId,
  isStaff,
  isLoggedIn,
}: {
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string;
  postId?: string;
  isStaff: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function forceDelete() {
    const label =
      targetType === "USED_LISTING"
        ? "이 중고 글을 강제 삭제할까요? 되돌릴 수 없습니다."
        : "이 게시물을 강제 삭제할까요? 되돌릴 수 없습니다.";
    if (!confirm(label)) return;

    startTransition(async () => {
      const res =
        targetType === "POST"
          ? await adminForceDeletePost(targetId)
          : targetType === "USED_LISTING"
            ? await adminForceDeleteUsedListing(targetId)
            : { error: "지원하지 않는 유형입니다." };

      if (res.error) {
        alert(res.error);
        return;
      }
      if (targetType === "POST") router.push("/");
      else if (targetType === "USED_LISTING") router.push("/used");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/60">
      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <ReportButton
            targetType={targetType}
            targetId={targetId}
            reportedUserId={reportedUserId}
            postId={postId}
          />
        ) : (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`}>신고</Link>
          </Button>
        )}
        {isStaff && (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href="/admin">
              <ShieldAlert className="h-3.5 w-3.5" />
              관리자
            </Link>
          </Button>
        )}
      </div>
      {isStaff && (targetType === "POST" || targetType === "USED_LISTING") && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={forceDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {pending ? "삭제 중…" : "강제 삭제"}
        </Button>
      )}
    </div>
  );
}
