import { ensureStringArray } from "@/lib/ensure-array";

const DEFAULT_BANNED = [
  "discord.gg",
  "telegram.me",
  "bit.ly",
  "Free top-up",
  "Casino",
  "Gambling",
];

export function mergeBannedWords(channelWords: string[] | unknown): string[] {
  const extra = ensureStringArray(channelWords).map((w) => w.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...DEFAULT_BANNED, ...extra])];
}

export function filterLiveChatContent(
  content: string,
  bannedWords: string[]
): { ok: true; text: string } | { ok: false; error: string } {
  const text = content.trim().slice(0, 200);
  if (!text) return { ok: false, error: "Enter a message." };
  const lower = text.toLowerCase();
  for (const word of mergeBannedWords(bannedWords)) {
    if (word && lower.includes(word.toLowerCase())) {
      return { ok: false, error: "This message contains blocked words." };
    }
  }
  if (/(.)\1{8,}/.test(text)) {
    return { ok: false, error: "Too many repeated characters." };
  }
  return { ok: true, text };
}

export function looksLikeSpamDuplicate(prev: string | null, next: string): boolean {
  if (!prev) return false;
  return prev.trim().toLowerCase() === next.trim().toLowerCase();
}
