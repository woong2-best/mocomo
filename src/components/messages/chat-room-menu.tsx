"use client";

import { useState } from "react";
import { Flag, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContentReportFlow } from "@/components/report/content-report-flow";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

export function ChatRoomMenu({
  roomId,
  otherUserId,
  productId,
  readOnly,
  onReportSubmitted,
}: {
  roomId: string;
  otherUserId?: string;
  productId?: string;
  readOnly?: boolean;
  onReportSubmitted?: () => void;
}) {
  const { locale } = useLocale();
  const [reportOpen, setReportOpen] = useState(false);

  if (readOnly) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-muted/80 shrink-0"
            aria-label={uiText(locale, "대화 메뉴", "Conversation menu")}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onSelect={() => setReportOpen(true)}
          >
            <Flag className="h-4 w-4" />
            {uiText(locale, "신고하기", "Report")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContentReportFlow
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="CHAT_ROOM"
        targetId={roomId}
        chatRoomId={roomId}
        reportedUserId={otherUserId}
        productId={productId}
        onSubmitted={onReportSubmitted}
      />
    </>
  );
}
