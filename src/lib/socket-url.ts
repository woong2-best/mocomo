/** 프로덕션/로컬에서 Socket.IO 서버 URL (없으면 null) */
export function resolveSocketUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const onLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (!url || (url.includes("localhost") && !onLocalHost)) return null;
  return url;
}
