import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { HumanChallengeChoice, HumanChallengeQuestion } from "@/lib/human-challenge-types";
import {
  ODD_ONE_BANK,
  SEQUENCE_BANK,
  TRIVIA_BANK,
  type OddOneChallenge,
  type SequenceChallenge,
  type TriviaChallenge,
} from "@/lib/human-challenge-bank";
import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_GUEST_LOCALE, normalizeLocale } from "@/lib/i18n/config";
import {
  getDefaultChallengeHint,
  getMathChallengeHint,
  getVerifyChallengeErrors,
  localizePickChallenge,
} from "@/lib/human-challenge-i18n";

export type { HumanChallengeChoice, HumanChallengeQuestion } from "@/lib/human-challenge-types";

const TTL_MS = 10 * 60 * 1000;
const CHOICE_COUNT = 4;

type ChallengePayload = {
  answer: string;
  exp: number;
  nonce: string;
};

type PickChallenge = OddOneChallenge | SequenceChallenge | TriviaChallenge;

function challengeSecret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s && process.env.NODE_ENV === "production") {
    console.warn("[human-challenge] AUTH_SECRET missing — using weak fallback");
  }
  return s || "mocomo-human-challenge-dev";
}

function signPayload(payload: ChallengePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", challengeSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function parseToken(token: string): ChallengePayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", challengeSecret()).update(body).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ChallengePayload;
  } catch {
    return null;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickRandom<T>(bank: T[]): T {
  return bank[randomInt(0, bank.length)]!;
}

function buildDistractors(answer: string, correctNum: number, spread: number, count: number): string[] {
  const distractors = new Set<string>();
  let guard = 0;
  while (distractors.size < count && guard < 50) {
    guard++;
    const n = correctNum + randomInt(-spread, spread);
    if (n > 0 && String(n) !== answer) distractors.add(String(n));
  }
  while (distractors.size < count) {
    const n = correctNum + distractors.size + randomInt(1, 5);
    if (String(n) !== answer) distractors.add(String(n));
  }
  return [...distractors].slice(0, count);
}

function finalizeQuestion(
  prompt: string,
  answerId: string,
  choices: HumanChallengeChoice[],
  locale: Locale,
  hint?: string
): HumanChallengeQuestion {
  const unique = new Map<string, HumanChallengeChoice>();
  for (const c of choices) {
    if (!unique.has(c.id)) unique.set(c.id, c);
  }
  let list = [...unique.values()];
  if (!list.some((c) => c.id === answerId)) {
    list.unshift({ id: answerId, label: answerId });
  }
  if (list.length < CHOICE_COUNT) {
    let i = 0;
    while (list.length < CHOICE_COUNT) {
      const fake = `x${answerId}_${i++}`;
      if (!unique.has(fake)) list.push({ id: fake, label: String(randomInt(1, 99)) });
    }
  }
  list = shuffle(list).slice(0, CHOICE_COUNT);
  const token = signPayload({
    answer: answerId,
    exp: Date.now() + TTL_MS,
    nonce: randomBytes(8).toString("hex"),
  });
  return {
    token,
    prompt,
    hint: hint ?? getDefaultChallengeHint(locale),
    choices: list,
  };
}

function pickChoicesFromSet(set: PickChallenge, locale: Locale): HumanChallengeQuestion {
  const localized = localizePickChallenge(set, locale);
  const wrongShuffled = shuffle(localized.wrong);
  const wrongPick = wrongShuffled.slice(0, CHOICE_COUNT - 1);
  const merged = shuffle([localized.correct, ...wrongPick]);
  return finalizeQuestion(
    localized.prompt,
    localized.correct.id,
    merged,
    locale,
    localized.hint
  );
}

function mathAddQuiz(locale: Locale): HumanChallengeQuestion {
  const a = randomInt(2, 15);
  const b = randomInt(2, 15);
  const answer = String(a + b);
  const wrong = buildDistractors(answer, a + b, 5, CHOICE_COUNT - 1);
  return finalizeQuestion(
    `${a} + ${b} = ?`,
    answer,
    [{ id: answer, label: answer }, ...wrong.map((n) => ({ id: n, label: n }))],
    locale,
    getMathChallengeHint(locale, "add")
  );
}

function mathSubQuiz(locale: Locale): HumanChallengeQuestion {
  const a = randomInt(8, 20);
  const b = randomInt(2, a - 1);
  const answer = String(a - b);
  const wrong = buildDistractors(answer, a - b, 4, CHOICE_COUNT - 1);
  return finalizeQuestion(
    `${a} − ${b} = ?`,
    answer,
    [{ id: answer, label: answer }, ...wrong.map((n) => ({ id: n, label: n }))],
    locale,
    getMathChallengeHint(locale, "sub")
  );
}

function mathMulQuiz(locale: Locale): HumanChallengeQuestion {
  const a = randomInt(2, 9);
  const b = randomInt(2, 9);
  const answer = String(a * b);
  const wrong = buildDistractors(answer, a * b, 6, CHOICE_COUNT - 1);
  return finalizeQuestion(
    `${a} × ${b} = ?`,
    answer,
    [{ id: answer, label: answer }, ...wrong.map((n) => ({ id: n, label: n }))],
    locale,
    getMathChallengeHint(locale, "mul")
  );
}

function oddOneQuiz(locale: Locale): HumanChallengeQuestion {
  return pickChoicesFromSet(pickRandom(ODD_ONE_BANK), locale);
}

function sequenceQuiz(locale: Locale): HumanChallengeQuestion {
  return pickChoicesFromSet(pickRandom(SEQUENCE_BANK), locale);
}

function triviaQuiz(locale: Locale): HumanChallengeQuestion {
  return pickChoicesFromSet(pickRandom(TRIVIA_BANK), locale);
}

const QUIZ_BUILDERS = [
  (locale: Locale) => mathAddQuiz(locale),
  (locale: Locale) => mathSubQuiz(locale),
  (locale: Locale) => mathMulQuiz(locale),
  (locale: Locale) => oddOneQuiz(locale),
  (locale: Locale) => oddOneQuiz(locale),
  (locale: Locale) => oddOneQuiz(locale),
  (locale: Locale) => sequenceQuiz(locale),
  (locale: Locale) => sequenceQuiz(locale),
  (locale: Locale) => triviaQuiz(locale),
  (locale: Locale) => triviaQuiz(locale),
] as const;

export function createHumanChallenge(localeInput?: Locale | string | null): HumanChallengeQuestion {
  const locale = normalizeLocale(localeInput, DEFAULT_GUEST_LOCALE);
  const builder = QUIZ_BUILDERS[randomInt(0, QUIZ_BUILDERS.length)]!;
  return builder(locale);
}

export function verifyHumanChallengeAnswer(
  token: string | undefined | null,
  answer: string | undefined | null,
  localeInput?: Locale | string | null
): { ok: true } | { ok: false; error: string } {
  const errors = getVerifyChallengeErrors(normalizeLocale(localeInput, DEFAULT_GUEST_LOCALE));
  const trimmedAnswer = answer?.trim();
  if (!token?.trim() || !trimmedAnswer) {
    return { ok: false, error: errors.missing };
  }
  const payload = parseToken(token.trim());
  if (!payload) {
    return { ok: false, error: errors.expired };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, error: errors.timeout };
  }
  if (payload.answer !== trimmedAnswer) {
    return { ok: false, error: errors.wrong };
  }
  return { ok: true };
}

/** 테스트·관리용 문제 수 */
export function getHumanChallengeBankSize(): number {
  return ODD_ONE_BANK.length + SEQUENCE_BANK.length + TRIVIA_BANK.length + 3;
}
