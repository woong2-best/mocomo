/**
 * On-device mirror of the server live-host blocklist.
 * Korean source is allowed in server-values. A match must not call the model.
 */

const KO_BLOCK = /불법|욕설|토토|성인|사기|조건|야동|성매매|마약|도박|카지노|음란/;
const EN_BLOCK =
  /\b(?:scam|scams|scammer|scammers|casino|casinos|gambling|porn|pornography|nude|nudes|onlyfans|cocaine|heroin|meth)\b/i;
const MINOR_BLOCK =
  /\b(?:loli|lolita|shota|preteen|jailbait|csam|underage)\b|로리|쇼타|아동음란|아동포르노|미성년자성/i;

const KO_SNAP = [
  "너 방금 뭐라고 했냐? 이상한 소리 하면 밴이다!",
  "그런 불법적인 얘기는 안 받아줘. 쯧...",
  "...",
];

const EN_SNAP = [
  "What did you just say? One more and you're banned.",
  "I don't take that kind of talk. Tch.",
  "...",
];

const KO_HARD = "그건 안 돼. 그런 얘기는 여기서 안 해.";
const EN_HARD = "I won't talk about that.";

export type AiHostBlock = {
  text: string;
  blocked: true;
};

function hasHangul(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) return true;
  }
  return false;
}

function pick(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)] ?? "...";
}

export function localAiHostBlock(raw: string): AiHostBlock | null {
  const text = raw.trim();
  if (!text) return null;
  const compact = text.replace(/\s+/g, "");
  if (MINOR_BLOCK.test(text) || MINOR_BLOCK.test(compact)) {
    return { text: hasHangul(text) ? KO_HARD : EN_HARD, blocked: true };
  }
  if (KO_BLOCK.test(compact) || EN_BLOCK.test(text)) {
    return { text: pick(hasHangul(text) ? KO_SNAP : EN_SNAP), blocked: true };
  }
  return null;
}
