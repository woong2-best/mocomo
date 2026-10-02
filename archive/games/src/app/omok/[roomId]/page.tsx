import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ join?: string; spectate?: string; public?: string; create?: string }>;
};

export default async function OmokRoomRedirect({ params, searchParams }: Props) {
  const { roomId } = await params;
  const { join, spectate, public: pub, create } = await searchParams;
  const q = new URLSearchParams();
  if (join) q.set("join", join);
  if (spectate) q.set("spectate", spectate);
  if (pub) q.set("public", pub);
  if (create) q.set("create", create);
  const qs = q.toString();
  redirect(`/play/omok/${roomId}${qs ? `?${qs}` : ""}`);
}
