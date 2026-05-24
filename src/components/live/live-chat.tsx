"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type LiveMsg = {
  userId: string;
  username: string;
  content: string;
  at: number;
  image?: string | null;
};

export function LiveChat({ channelId }: { channelId: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [text, setText] = useState("");
  const [viewerCount, setViewerCount] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const socket = io(url, {
      auth: { userId: session?.user?.id },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.emit("join_live", channelId);

    socket.on("live_chat_message", (msg: LiveMsg) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });
    socket.on("live_viewers", (n: number) => setViewerCount(n));

    return () => {
      socket.emit("leave_live", channelId);
      socket.disconnect();
    };
  }, [channelId, session?.user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const content = text.trim();
    if (!content || !session?.user) return;
    socketRef.current?.emit("live_chat", {
      channelId,
      userId: session.user.id,
      username: session.user.username ?? "user",
      content,
      image: session.user.image,
    });
    setText("");
  }

  return (
    <div className="flex flex-col h-full min-h-[320px] rounded-2xl border border-border/60 bg-background/95">
      <div className="px-3 py-2 border-b border-border/60 flex justify-between items-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground">라이브 채팅</span>
        <span>{viewerCount}명 접속</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[360px]">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">첫 메시지를 남겨보세요!</p>
        )}
        {messages.map((m, i) => (
          <div key={`${m.at}-${i}`} className="flex gap-2 text-sm">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={m.image ?? undefined} />
              <AvatarFallback>{m.username[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-primary">@{m.username}</span>
              <p className="text-sm break-words">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {session?.user ? (
        <div className="p-2 border-t border-border/60 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="채팅 입력..."
            className="rounded-xl text-sm h-9"
            maxLength={200}
          />
          <Button size="sm" className="rounded-xl shrink-0" onClick={send}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="p-3 text-xs text-center text-muted-foreground">채팅하려면 로그인하세요</p>
      )}
    </div>
  );
}
