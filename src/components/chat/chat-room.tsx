"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const socket = io(url, { auth: { userId } });
    socketRef.current = socket;
    socket.emit("join_room", roomId);
    socket.on("new_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, userId]);

  function send() {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("send_message", {
      roomId,
      senderId: userId,
      content: input.trim(),
    });
    setInput("");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender.id === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                m.sender.id === userId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.sender.id !== userId && (
                <p className="text-xs opacity-70 mb-1">{m.sender.username}</p>
              )}
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지 입력..."
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
