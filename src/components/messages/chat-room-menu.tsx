"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, LogOut, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContentReportFlow } from "@/components/report/content-report-flow";
import { useLocale } from "@/components/providers/locale-provider";
import { exitChat } from "@/actions/chat";

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
  const { t } = useLocale();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [exiting, startExit] = useTransition();

  function onExitChat() {
    if (!window.confirm(t("ui.exit_chat_confirm"))) return;
    startExit(async () => {
      const result = await exitChat(roomId);
      if ("error" in result && result.error) {
        window.alert(t("ui.exit_chat_failed"));
        return;
      }
      router.push("/messages");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-muted/80 shrink-0"
            aria-label={t("ui.conversation_menu")}
            disabled={exiting}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!readOnly ? (
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onSelect={() => setReportOpen(true)}
            >
              <Flag className="h-4 w-4" />
              {t("report.title")}
            </DropdownMenuItem>
          ) : null}
          {!readOnly ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            disabled={exiting}
            onSelect={onExitChat}
          >
            <LogOut className="h-4 w-4" />
            {t("ui.exit_chat")}
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
