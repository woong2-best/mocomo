const BASE = "https://mocomo.net";
const html = await fetch(`${BASE}/feed`, { headers: { "cache-control": "no-cache" } }).then((r) =>
  r.text()
);
const paths = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
const needles = ["SIZING_WAIT", "maxHeight", "alignPaintSizeToDisplayWhenReady"];
let hits = 0;
for (const p of paths) {
  const js = await fetch(`${BASE}${p}`).then((r) => r.text());
  if (needles.some((n) => js.includes(n))) {
    hits += 1;
    console.log("hit", p.slice(-48));
  }
}
console.log("chunks", paths.length, "hits", hits);
