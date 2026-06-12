import { RpsRoomClient } from "@/components/rps/rps-room-client";
import { isValidRoomCode } from "@/lib/sketch-quiz-words";
import { notFound } from "next/navigation";

export const metadata = { title: "가위바위보 방 | MoCoMo" };

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string }>;
};

export default async function RpsRoomPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const { join, spectate } = await searchParams;
  const code = roomId.toUpperCase();
  if (!isValidRoomCode(code)) notFound();
  const mode = spectate === "1" ? "spectate" : join === "1" ? "join" : "create";

  return (
    <div className="max-w-3xl mx-auto p-4 py-6">
      <RpsRoomClient roomId={code} mode={mode} />
    </div>
  );
}
