const DEFAULT_BANNED = [
  "discord.gg",
  "telegram.me",
  "bit.ly",
  "무료충전",
  "카지노",
  "도박",
];

export function mergeBannedWords(channelWords: string[]): string[] {
  const extra = channelWords.map((w) => w.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...DEFAULT_BANNED, ...extra])];
}

export function filterLiveChatContent(
  content: string,
  bannedWords: string[]
): { ok: true; text: string } | { ok: false; error: string } {
  const text = content.trim().slice(0, 200);
  if (!text) return { ok: false, error: "메시지를 입력해 주세요." };
  const lower = text.toLowerCase();
  for (const word of mergeBannedWords(bannedWords)) {
    if (word && lower.includes(word.toLowerCase())) {
      return { ok: false, error: "금칙어가 포함된 메시지입니다." };
    }
  }
  if (/(.)\1{8,}/.test(text)) {
    return { ok: false, error: "반복 문자가 너무 많습니다." };
  }
  return { ok: true, text };
}

export function looksLikeSpamDuplicate(prev: string | null, next: string): boolean {
  if (!prev) return false;
  return prev.trim().toLowerCase() === next.trim().toLowerCase();
}
