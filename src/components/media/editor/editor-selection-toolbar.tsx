"use client";

import { Copy, Trash2, BringToFront, SendToBack } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EditorSelectionToolbar({
  onDelete,
  onDuplicate,
  onBringFront,
  onSendBack,
  disabled,
}: {
  onDelete: () => void;
  onDuplicate: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1.5 py-1 shadow-md backdrop-blur-sm">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="삭제" disabled={disabled} onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="복제" disabled={disabled} onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="맨 앞으로" disabled={disabled} onClick={onBringFront}>
        <BringToFront className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="맨 뒤로" disabled={disabled} onClick={onSendBack}>
        <SendToBack className="h-4 w-4" />
      </Button>
    </div>
  );
}
