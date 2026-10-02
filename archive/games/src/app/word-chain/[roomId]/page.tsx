import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string }>;
};

export default async function WordChainRoomRedirect({ params, searchParams }: Props) {
  const { roomId } = await params;
  const { join, spectate } = await searchParams;
  const q = new URLSearchParams();
  if (join) q.set("join", join);
  if (spectate) q.set("spectate", spectate);
  const qs = q.toString();
  redirect(`/play/word-chain/${roomId}${qs ? `?${qs}` : ""}`);
}
