"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { MinigameChatMessage } from "@/lib/minigames/shared-types";

export function MinigameChatPanel({
  messages,
  onSend,
  disabled,
}: {
  messages: MinigameChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <Card className="border border-folk-cobalt/15">
      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">방 채팅</p>
        <div className="h-32 overflow-y-auto text-xs space-y-1 bg-muted/20 rounded-lg p-2">
          {messages.length === 0 && <p className="text-muted-foreground">메시지 없음</p>}
          {messages.map((m, i) => (
            <p key={`${m.at}-${i}`}>
              <span className="font-semibold text-folk-cobalt">{m.username}</span>: {m.text}
            </p>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSend(text.trim());
            setText("");
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지" disabled={disabled} className="h-8 text-xs" />
          <Button type="submit" size="sm" disabled={disabled} className="rounded-lg shrink-0">
            전송
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
