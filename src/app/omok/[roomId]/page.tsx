import { OmokRoomClient } from "@/components/omok/omok-room-client";
import { isValidRoomCode } from "@/lib/sketch-quiz-words";
import { notFound } from "next/navigation";

export const metadata = { title: "오목 방 | MoCoMo" };

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string }>;
};

export default async function OmokRoomPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const { join, spectate } = await searchParams;
  const code = roomId.toUpperCase();
  if (!isValidRoomCode(code)) notFound();

  const mode = spectate === "1" ? "spectate" : join === "1" ? "join" : "create";

  return (
    <div className="max-w-5xl mx-auto p-4 py-6">
      <OmokRoomClient roomId={code} mode={mode} />
    </div>
  );
}
