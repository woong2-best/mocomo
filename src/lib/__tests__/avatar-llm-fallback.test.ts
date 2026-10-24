import test from "node:test";
import assert from "node:assert/strict";
import { quietLine, replyForAvatar } from "@/lib/ai-live/avatar-llm";
import { memoryCatalogStore } from "@/lib/ai-live/llm/catalog";
import { discoverModels } from "@/lib/ai-live/llm/discover";
import type { AvatarLlmCatalog, ChatRequest, ChatResult } from "@/lib/ai-live/llm/types";

function catalog(live: string[]): AvatarLlmCatalog {
  return {
    checkedAt: new Date().toISOString(),
    providers: {
      groq: { live, dead: {}, cooldown: {} },
    },
  };
}

test("a dead first model falls through and the next candidate answers", async () => {
  const store = memoryCatalogStore(catalog(["dead-model", "live-model"]));
  const alerts: string[] = [];
  const reply = await replyForAvatar("hi", "zelie", {
    store,
    ensure: async () => (await store.load()) ?? catalog([]),
    configured: (company) => company === "groq",
    alert: async (item) => {
      alerts.push(item.key);
      return true;
    },
    rediscover: async () => (await store.load()) ?? catalog([]),
    async chat(req: ChatRequest): Promise<ChatResult> {
      if (req.model === "dead-model") return { kind: "dead", status: 404 };
      if (req.model === "live-model") return { kind: "text", text: "hey.", emotion: "happy" };
      return { kind: "fail", status: 500 };
    },
  });
  assert.equal(reply.text, "hey.");
  assert.equal(reply.exhausted, undefined);
  assert.equal(alerts.includes("dead:groq:dead-model"), true);
  assert.equal(store.snapshot()?.providers.groq?.live.includes("dead-model"), false);
});

test("Workers AI answers when every company key is missing", async () => {
  const store = memoryCatalogStore({ checkedAt: new Date().toISOString(), providers: {} });
  const reply = await replyForAvatar("hi", "mio", {
    store,
    ensure: async () => (await store.load()) ?? { checkedAt: "", providers: {} },
    configured: (company) => company === "workers-ai",
    alert: async () => false,
    rediscover: async () => ({ checkedAt: "", providers: {} }),
    async chat(req): Promise<ChatResult> {
      if (req.company === "workers-ai") return { kind: "text", text: "from workers", emotion: "neutral" };
      return { kind: "fail" };
    },
  });
  assert.equal(reply.text, "from workers");
});

test("all candidates down returns the quiet line as exhausted", async () => {
  const store = memoryCatalogStore(catalog(["gone"]));
  const alerts: string[] = [];
  const reply = await replyForAvatar("hi", "zelie", {
    store,
    ensure: async () => (await store.load()) ?? catalog([]),
    configured: (company) => company === "groq",
    alert: async (item) => {
      alerts.push(item.key);
      return true;
    },
    rediscover: async () => (await store.load()) ?? catalog([]),
    async chat(): Promise<ChatResult> {
      return { kind: "fail", status: 500 };
    },
  });
  assert.equal(reply.exhausted, true);
  assert.equal(reply.text, quietLine("hi"));
  assert.equal(alerts.includes("exhausted:zelie"), true);
});

test("discover drops a 404 candidate and keeps a 200", async () => {
  const store = memoryCatalogStore(null);
  const prevGroq = process.env.GROQ_API_KEY;
  const prevCandidates = process.env.AVATAR_LLM_GROQ_CANDIDATES;
  process.env.GROQ_API_KEY = "test-key";
  process.env.AVATAR_LLM_GROQ_CANDIDATES = "dead-id,ok-id";
  try {
    const next = await discoverModels({
      store,
      listModels: async (company) => (company === "groq" ? ["dead-id", "ok-id"] : []),
      probe: async (_company, model) =>
        model === "ok-id" ? { status: 200, ok: true } : { status: 404, ok: false },
    });
    assert.deepEqual(next.providers.groq?.live, ["ok-id"]);
    assert.equal(next.providers.groq?.dead["dead-id"]?.status, 404);
  } finally {
    if (prevGroq == null) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prevGroq;
    if (prevCandidates == null) delete process.env.AVATAR_LLM_GROQ_CANDIDATES;
    else process.env.AVATAR_LLM_GROQ_CANDIDATES = prevCandidates;
  }
});
