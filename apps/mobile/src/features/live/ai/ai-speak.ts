import { ApiError, apiRequest } from "@/api/client";

export type AiHostSpeech = {
  text: string;
  emotion: string;
  audioBase64: string | null;
};

/** Website host reply: same model, same voice, same character language. */
export async function speakAiHost(text: string, characterId: string): Promise<AiHostSpeech> {
  try {
    const res = await apiRequest<AiHostSpeech>("/api/mobile/live/ai-host/speak", {
      method: "POST",
      body: { text, characterId },
      timeoutMs: 55_000,
    });
    return {
      text: typeof res.text === "string" ? res.text : "",
      emotion: typeof res.emotion === "string" ? res.emotion : "neutral",
      audioBase64: typeof res.audioBase64 === "string" ? res.audioBase64 : null,
    };
  } catch (err) {
    if (err instanceof ApiError && err.body && typeof err.body === "object") {
      const body = err.body as { text?: unknown; emotion?: unknown; audioBase64?: unknown };
      if (typeof body.text === "string" && body.text.trim()) {
        return {
          text: body.text,
          emotion: typeof body.emotion === "string" ? body.emotion : "neutral",
          audioBase64: typeof body.audioBase64 === "string" ? body.audioBase64 : null,
        };
      }
    }
    throw err;
  }
}

export type AiStageFiles = {
  characterId: string;
  vrmUrl: string;
  backdropUrl: string | null;
};

const DEFAULT_STAGE: Record<string, AiStageFiles> = {
  zelie: {
    characterId: "zelie",
    vrmUrl: "/avatars/zelie.vrm",
    backdropUrl: "/live/backgrounds/moco-room.jpg",
  },
  cleo: {
    characterId: "cleo",
    vrmUrl: "/models/airi.vrm",
    backdropUrl: "/live/backgrounds/airi-room.jpg",
  },
  mio: {
    characterId: "mio",
    vrmUrl: "/models/chloe.vrm",
    backdropUrl: "/live/backgrounds/chloe-room.jpg",
  },
  nangnang: {
    characterId: "nangnang",
    vrmUrl: "/models/nangnang.vrm",
    backdropUrl: "/live/backgrounds/nangnang-room.jpg",
  },
};

const ALIAS: Record<string, string> = {
  zelie: "zelie",
  moco: "zelie",
  cleo: "cleo",
  airi: "cleo",
  mio: "mio",
  chloe: "mio",
  nangnang: "nangnang",
  stella: "nangnang",
};

export function defaultAiStage(characterId: string): AiStageFiles {
  return DEFAULT_STAGE[ALIAS[characterId.trim().toLowerCase()] ?? "zelie"] ?? DEFAULT_STAGE.zelie!;
}

export function stageForCharacter(
  id: string,
  stages?: Record<string, AiStageFiles> | null
): AiStageFiles {
  const fallback = defaultAiStage(id);
  return stages?.[fallback.characterId] ?? fallback;
}

export async function fetchAiStages(): Promise<Record<string, AiStageFiles>> {
  const next: Record<string, AiStageFiles> = {
    zelie: defaultAiStage("zelie"),
    cleo: defaultAiStage("cleo"),
    mio: defaultAiStage("mio"),
    nangnang: defaultAiStage("nangnang"),
  };
  try {
    const res = await apiRequest<{ stages?: AiStageFiles[] }>("/api/mobile/live/ai-host/stage?all=1", {
      auth: false,
      timeoutMs: 12_000,
    });
    for (const row of res.stages ?? []) {
      if (!row?.characterId || !row.vrmUrl) continue;
      next[row.characterId] = {
        characterId: row.characterId,
        vrmUrl: row.vrmUrl,
        backdropUrl: row.backdropUrl ?? next[row.characterId]?.backdropUrl ?? null,
      };
    }
  } catch {
    /* defaults still match the built-in website files */
  }
  return next;
}

export async function fetchAiStage(characterId: string): Promise<AiStageFiles> {
  const fallback = defaultAiStage(characterId);
  try {
    const res = await apiRequest<{ characterId?: string; vrmUrl?: string; backdropUrl?: string | null }>(
      `/api/mobile/live/ai-host/stage?character=${encodeURIComponent(characterId)}`,
      { auth: false, timeoutMs: 12_000 }
    );
    if (!res.vrmUrl) return fallback;
    return {
      characterId: res.characterId || fallback.characterId,
      vrmUrl: res.vrmUrl,
      backdropUrl: res.backdropUrl ?? fallback.backdropUrl,
    };
  } catch {
    return fallback;
  }
}
