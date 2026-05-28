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
    hint: hint ?? "정답을 골라 주세요.",
    choices: list,
  };
}

function pickChoicesFromSet(set: PickChallenge): HumanChallengeQuestion {
  const wrongShuffled = shuffle(set.wrong);
  const wrongPick = wrongShuffled.slice(0, CHOICE_COUNT - 1);
  const merged = shuffle([set.correct, ...wrongPick]);
  return finalizeQuestion(set.prompt, set.correct.id, merged, set.hint);
}

function mathAddQuiz(): HumanChallengeQuestion {
  const a = randomInt(2, 15);
  const b = randomInt(2, 15);
  const answer = String(a + b);
  const wrong = buildDistractors(answer, a + b, 5, CHOICE_COUNT - 1);
  return finalizeQuestion(
    `${a} + ${b} = ?`,
    answer,
    [{ id: answer, label: answer }, ...wrong.map((n) => ({ id: n, label: n }))],
    "덧셈 정답을 고르세요."
  );
}

function mathSubQuiz(): HumanChallengeQuestion {
  const a = randomInt(8, 20);
  const b = randomInt(2, a - 1);
  const answer = String(a - b);
  const wrong = buildDistractors(answer, a - b, 4, CHOICE_COUNT - 1);
  return finalizeQuestion(
    `${a} − ${b} = ?`,
    answer,
    [{ id: answer, label: answer }, ...wrong.map((n) => ({ id: n, label: n }))],
    "뺄셈 정답을 고르세요."
  );
}

function mathMulQuiz(): HumanChallengeQuestion {
  const a = randomInt(2, 9);
  const b = randomInt(2, 9);
  const answer = String(a * b);
  const wrong = buildDistractors(answer, a * b, 6, CHOICE_COUNT - 1);
  return finalizeQuestion(
    `${a} × ${b} = ?`,
    answer,
    [{ id: answer, label: answer }, ...wrong.map((n) => ({ id: n, label: n }))],
    "곱셈 정답을 고르세요."
  );
}

function oddOneQuiz(): HumanChallengeQuestion {
  return pickChoicesFromSet(pickRandom(ODD_ONE_BANK));
}

function sequenceQuiz(): HumanChallengeQuestion {
  return pickChoicesFromSet(pickRandom(SEQUENCE_BANK));
}

function triviaQuiz(): HumanChallengeQuestion {
  return pickChoicesFromSet(pickRandom(TRIVIA_BANK));
}

const QUIZ_BUILDERS = [
  mathAddQuiz,
  mathSubQuiz,
  mathMulQuiz,
  oddOneQuiz,
  oddOneQuiz,
  oddOneQuiz,
  sequenceQuiz,
  sequenceQuiz,
  triviaQuiz,
  triviaQuiz,
] as const;

export function createHumanChallenge(): HumanChallengeQuestion {
  const builder = QUIZ_BUILDERS[randomInt(0, QUIZ_BUILDERS.length)]!;
  return builder();
}

export function verifyHumanChallengeAnswer(
  token: string | undefined | null,
  answer: string | undefined | null
): { ok: true } | { ok: false; error: string } {
  const trimmedAnswer = answer?.trim();
  if (!token?.trim() || !trimmedAnswer) {
    return { ok: false, error: "확인 퀴즈를 풀어 주세요." };
  }
  const payload = parseToken(token.trim());
  if (!payload) {
    return { ok: false, error: "확인 퀴즈가 만료되었습니다. 새로고침 후 다시 시도해 주세요." };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, error: "확인 퀴즈 시간이 지났습니다. 새로고침 후 다시 시도해 주세요." };
  }
  if (payload.answer !== trimmedAnswer) {
    return { ok: false, error: "정답이 아닙니다. 다시 골라 주세요." };
  }
  return { ok: true };
}

/** 테스트·관리용 문제 수 */
export function getHumanChallengeBankSize(): number {
  return ODD_ONE_BANK.length + SEQUENCE_BANK.length + TRIVIA_BANK.length + 3;
}
