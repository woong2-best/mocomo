const BASE = "https://mocomo.net";
const html = await fetch(`${BASE}/feed`, { headers: { "cache-control": "no-cache" } }).then((r) =>
  r.text()
);
const paths = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
for (const p of paths) {
  const js = await fetch(`${BASE}${p}`, { headers: { "cache-control": "no-cache" } }).then((r) =>
    r.text()
  );
  if (js.includes("SIZING_WAIT")) {
    console.log("SIZING_WAIT in", p);
  }
  if (js.includes("alignPaintSizeToDisplayWhenReady_null")) {
    console.log("new retry reason in", p);
  }
}
