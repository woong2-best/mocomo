"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import { ReportButton } from "@/components/report/report-button";
import { Button } from "@/components/ui/button";
import { AdminContentActionMenu } from "@/components/moderation/admin-content-action-menu";
import type { ContentTargetType } from "@/lib/operator-sanctions";

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
  const pathname = usePathname();
  const showPublicReport = targetType !== "POST";
  const moderateType: ContentTargetType | null =
    targetType === "POST" || targetType === "USED_LISTING" || targetType === "MARKETPLACE_LISTING"
      ? targetType
      : null;

  if (!showPublicReport && !isStaff && !moderateType) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          {showPublicReport ? (
            isLoggedIn ? (
              <ReportButton
                targetType={targetType}
                targetId={targetId}
                reportedUserId={reportedUserId}
                postId={postId}
              />
            ) : (
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                  {t("report.sy3gg")}
                </Link>
              </Button>
            )
          ) : null}
          {isStaff && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link href="/admin">
                <ShieldAlert className="h-3.5 w-3.5" />
                Operator
              </Link>
            </Button>
          )}
        </div>
        {moderateType ? (
          <AdminContentActionMenu
            targetType={moderateType}
            targetId={targetId}
            authorId={reportedUserId}
          />
        ) : null}
      </div>
    </div>
  );
}
