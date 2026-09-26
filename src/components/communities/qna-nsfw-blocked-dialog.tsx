"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QNA_NSFW_BLOCKED_MSG, QNA_NSFW_BLOCKED_TITLE } from "@/lib/qna-nsfw-category";

export function QnaNsfwBlockedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{QNA_NSFW_BLOCKED_TITLE}</DialogTitle>
          <DialogDescription>{QNA_NSFW_BLOCKED_MSG}</DialogDescription>
        </DialogHeader>
        <Button className="w-full rounded-full" onClick={() => onOpenChange(false)}>
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );
}
