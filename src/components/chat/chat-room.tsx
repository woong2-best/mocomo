"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { sendMessage } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

type Message = {
  id: string;
  content: string | null;
  createdAt: string;
  sender: { id: string; username: string; image: string | null };
};

export function ChatRoomClient({
  roomId,
  userId,
  username,
  initialMessages = [],
}: {
  roomId: string;
  userId: string;
  username: string;
  initialMessages?: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url || url.includes("localhost")) return;

    const socket = io(url, { auth: { userId }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join_room", roomId);
    socket.on("new_message", (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, userId]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await sendMessage({ roomId, content: text });
      const msg = result.message;
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          sender: {
            id: msg.sender.id,
            username: msg.sender.username ?? username,
            image: msg.sender.image,
          },
        },
      ]);
      setInput("");
    } catch {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">첫 메시지를 보내 보세요.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender.id === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                m.sender.id === userId ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {m.sender.id !== userId && (
                <p className="text-xs opacity-70 mb-1">{m.sender.username}</p>
              )}
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-xs text-destructive px-4 pb-1">{error}</p>}
      <div className="border-t border-border p-4 flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={sending}
        />
        <Button size="icon" onClick={send} disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
