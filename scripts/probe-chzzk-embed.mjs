/** Phase 1 — 치지직 embed URL 프로브 */
const channelId = process.argv[2] || "sample";
const url = `https://chzzk.naver.com/embed/live/${encodeURIComponent(channelId)}`;

const res = await fetch(url, {
  method: "GET",
  redirect: "follow",
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; MoCoMoEmbedProbe/1.0)",
    Accept: "text/html",
  },
  signal: AbortSignal.timeout(10000),
});

const xfo = res.headers.get("x-frame-options");
const csp = res.headers.get("content-security-policy");
const frameBlocked =
  (xfo && /deny|sameorigin/i.test(xfo)) ||
  (csp && /frame-ancestors\s+('none'|none)/i.test(csp));

const out = {
  url,
  status: res.status,
  xFrameOptions: xfo,
  cspFrameAncestors: csp?.match(/frame-ancestors[^;]+/i)?.[0] ?? null,
  frameBlocked: !!frameBlocked,
  decision: res.ok && !frameBlocked ? "embed_possible" : "open_external_fallback",
};

console.log(JSON.stringify(out, null, 2));
