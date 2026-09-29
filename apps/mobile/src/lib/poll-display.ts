/** Web `pollOptionPercents`와 동일 — 앱 번들용 복사 */
export function pollOptionPercents(
  options: { id: string; count: number }[],
  totalVotes: number
): Map<string, { labelPct: number; barPct: number }> {
  const out = new Map<string, { labelPct: number; barPct: number }>();
  if (totalVotes <= 0) {
    for (const o of options) out.set(o.id, { labelPct: 0, barPct: 0 });
    return out;
  }

  const raw = options.map((o) => (o.count / totalVotes) * 100);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const label = [...floored];
  for (let k = 0; k < remainder; k++) {
    label[byFrac[k % byFrac.length]!.i] += 1;
  }

  options.forEach((o, i) => {
    let barPct = raw[i]!;
    if (o.count <= 0) barPct = 0;
    else if (o.count === totalVotes) barPct = 100;
    else barPct = Math.min(100, Math.max(0, barPct));
    out.set(o.id, { labelPct: label[i]!, barPct });
  });
  return out;
}
