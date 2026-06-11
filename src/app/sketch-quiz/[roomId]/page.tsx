import { SketchQuizRoomClient } from "@/components/sketch-quiz/sketch-quiz-room-client";
import { isValidRoomCode } from "@/lib/sketch-quiz-words";
import { notFound } from "next/navigation";

export const metadata = {
  title: "스케치퀴즈 방 | MoCoMo",
};

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ join?: string }>;
};

export default async function SketchQuizRoomPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const { join } = await searchParams;
  const code = roomId.toUpperCase();

  if (!isValidRoomCode(code)) notFound();

  const mode = join === "1" ? "join" : "create";

  return (
    <div className="max-w-5xl mx-auto p-4 py-6">
      <SketchQuizRoomClient roomId={code} mode={mode} />
    </div>
  );
}
