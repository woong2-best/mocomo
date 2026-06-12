import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string; public?: string }>;
};

export default async function OmokRoomRedirect({ params, searchParams }: Props) {
  const { roomId } = await params;
  const { join, spectate, public: pub } = await searchParams;
  const q = new URLSearchParams();
  if (join) q.set("join", join);
  if (spectate) q.set("spectate", spectate);
  if (pub) q.set("public", pub);
  const qs = q.toString();
  redirect(`/play/omok/${roomId}${qs ? `?${qs}` : ""}`);
}
