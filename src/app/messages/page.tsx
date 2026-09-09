import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-muted/15 text-center p-8 min-h-0">
      <div className="h-20 w-20 rounded-full bg-muted/80 flex items-center justify-center mb-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground/70" />
      </div>
      <p className="font-semibold text-lg">내 메시지</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
        왼쪽에서 대화를 선택하거나 새 메시지를 보내 보세요.
      </p>
      <Button asChild variant="outline" className="rounded-full mt-6">
        <Link href="/messages/new">새 메시지 작성</Link>
      </Button>
    </div>
  );
}
