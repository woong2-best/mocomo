/** WHIP/WHEP — SDP는 끝에 CRLF가 있어야 Cloudflare·브라우저가 파싱함 */

export function normalizeSdp(sdp: string): string {
  const body = sdp.replace(/\r\n/g, "\n").trim();
  if (!body) return "";
  const lines = body.split("\n").map((line) => line.trimEnd());
  let normalized = lines.join("\r\n");
  if (!normalized.endsWith("\r\n")) normalized += "\r\n";
  return normalized;
}
