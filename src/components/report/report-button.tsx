"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import { ContentReportFlow } from "@/components/report/content-report-flow";
import { Button } from "@/components/ui/button";

export function ReportButton({
  targetType,
  targetId,
  reportedUserId,
  postId,
  commentId,
  label = "신고",
  variant = "ghost",
  size = "sm",
}: {
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string;
  postId?: string;
  commentId?: string;
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="gap-1.5 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </Button>
      <ContentReportFlow
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        reportedUserId={reportedUserId}
        postId={postId}
        commentId={commentId}
      />
    </>
  );
}
