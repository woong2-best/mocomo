export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { discoverModelsIfBoot } = await import("@/lib/ai-live/llm/discover");
  void discoverModelsIfBoot().catch(() => undefined);
}
