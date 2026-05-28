import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { HumanChallengeChoice, HumanChallengeQuestion } from "@/lib/human-challenge-types";

export type { HumanChallengeChoice, HumanChallengeQuestion } from "@/lib/human-challenge-types";

const TTL_MS = 10 * 60 * 1000;

type ChallengePayload = {
  answer: string;
  exp: number;
  nonce: string;
};

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

function mathQuiz(): HumanChallengeQuestion {
  const a = randomInt(2, 12);
  const b = randomInt(2, 12);
  const answer = String(a + b);
  const distractors = new Set<string>();
  while (distractors.size < 3) {
    const n = a + b + randomInt(-4, 4);
    if (n > 0 && String(n) !== answer) distractors.add(String(n));
  }
  const choices = shuffle([
    { id: answer, label: String(a + b) },
    ...[...distractors].map((n) => ({ id: n, label: n })),
  ]);
  const token = signPayload({
    answer,
    exp: Date.now() + TTL_MS,
    nonce: randomBytes(8).toString("hex"),
  });
  return {
    token,
    prompt: `${a} + ${b} = ?`,
    hint: "정답을 골라 주세요.",
    choices,
  };
}

type OddOneSet = {
  prompt: string;
  correct: HumanChallengeChoice;
  wrong: HumanChallengeChoice[];
};

const ODD_ONE_SETS: OddOneSet[] = [
  {
    prompt: "과일이 아닌 것은?",
    correct: { id: "car", label: "🚗 자동차" },
    wrong: [
      { id: "apple", label: "🍎 사과" },
      { id: "grape", label: "🍇 포도" },
      { id: "banana", label: "🍌 바나나" },
    ],
  },
  {
    prompt: "동물이 아닌 것은?",
    correct: { id: "book", label: "📚 책" },
    wrong: [
      { id: "cat", label: "🐱 고양이" },
      { id: "dog", label: "🐶 강아지" },
      { id: "rabbit", label: "🐰 토끼" },
    ],
  },
  {
    prompt: "탈것이 아닌 것은?",
    correct: { id: "tree", label: "🌳 나무" },
    wrong: [
      { id: "plane", label: "✈️ 비행기" },
      { id: "train", label: "🚆 기차" },
      { id: "bike", label: "🚲 자전거" },
    ],
  },
];

function oddOneQuiz(): HumanChallengeQuestion {
  const set = ODD_ONE_SETS[randomInt(0, ODD_ONE_SETS.length)]!;
  const answer = set.correct.id;
  const choices = shuffle([set.correct, ...set.wrong.slice(0, 3)]);
  const token = signPayload({
    answer,
    exp: Date.now() + TTL_MS,
    nonce: randomBytes(8).toString("hex"),
  });
  return {
    token,
    prompt: set.prompt,
    hint: "하나만 골라 주세요.",
    choices,
  };
}

export function createHumanChallenge(): HumanChallengeQuestion {
  return randomInt(0, 2) === 0 ? mathQuiz() : oddOneQuiz();
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
