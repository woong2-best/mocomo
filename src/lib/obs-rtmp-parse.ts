/** LiveKit / SRS RTMP URL·키를 OBS 「서버」「방송 키」 형식으로 분리 */
export function parseRtmpForObs(
  rawUrl: string,
  rawKey: string
): { server: string; streamKey: string } | null {
  const key = (rawKey || "").trim();
  let url = (rawUrl || "").trim();
  if (!url && !key) return null;

  if (url && !key) {
    const slash = url.lastIndexOf("/");
    if (slash > "rtmp://x".length) {
      return {
        server: url.slice(0, slash),
        streamKey: url.slice(slash + 1),
      };
    }
  }

  if (url && key && url.endsWith(`/${key}`)) {
    url = url.slice(0, -(key.length + 1));
  }

  return {
    server: url.replace(/\/$/, ""),
    streamKey: key,
  };
}
