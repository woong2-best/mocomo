import test from "node:test";
import assert from "node:assert/strict";
import { CLEO_PROMPT, MIO_PROMPT, NANGNANG_PROMPT, ZELIE_PROMPT, promptForCharacter } from "@/constants/prompts";
import { AVATAR_LLM, llmRouteForAvatar, resolveLiveAvatarId } from "@/lib/ai-live/avatars";
import { primaryCompanyForAvatar } from "@/lib/ai-live/llm/config";
import { systemInstructionFor } from "@/lib/ai-live/host-reply";

test("each avatar has a distinct persona and model", () => {
  assert.equal(resolveLiveAvatarId("moco"), "zelie");
  assert.equal(resolveLiveAvatarId("AIRI"), "cleo");
  assert.equal(resolveLiveAvatarId("chloe"), "mio");
  assert.equal(resolveLiveAvatarId("stella"), "nangnang");
  assert.equal(promptForCharacter("airi"), CLEO_PROMPT);
  assert.equal(promptForCharacter("CHLOE"), MIO_PROMPT);
  assert.equal(promptForCharacter("stella"), NANGNANG_PROMPT);
  assert.equal(promptForCharacter(null), ZELIE_PROMPT);
  assert.match(CLEO_PROMPT, /\[Identity: CLEO\]/);
  assert.match(MIO_PROMPT, /\[Identity: MIO\]/);
  assert.match(NANGNANG_PROMPT, /\[Identity: NANGNANG\]/);
  assert.match(ZELIE_PROMPT, /\[Identity: ZELIE\]/);
  assert.match(CLEO_PROMPT, /귀요미/);
  assert.match(MIO_PROMPT, /마미/);
  assert.match(NANGNANG_PROMPT, /자본주의/);
  assert.deepEqual(AVATAR_LLM.zelie, { company: "groq" });
  assert.deepEqual(AVATAR_LLM.cleo, { company: "openrouter" });
  assert.deepEqual(AVATAR_LLM.mio, { company: "cerebras" });
  assert.deepEqual(AVATAR_LLM.nangnang, { company: "mistral" });
  assert.equal(llmRouteForAvatar("moco").company, "groq");
  assert.equal(primaryCompanyForAvatar("zelie"), "groq");
  assert.equal(primaryCompanyForAvatar("mio"), "cerebras");
  assert.equal(primaryCompanyForAvatar("nangnang"), "mistral");
  assert.equal(primaryCompanyForAvatar("cleo"), "openrouter");
});

test("system instruction stays on one identity", () => {
  const cleo = systemInstructionFor("cleo");
  const mio = systemInstructionFor("mio");
  const nangnang = systemInstructionFor("nangnang");
  assert.match(cleo, /\[Identity: CLEO\]/);
  assert.equal(cleo.includes("[Identity: MIO]"), false);
  assert.match(mio, /\[Identity: MIO\]/);
  assert.equal(mio.includes("[Identity: CLEO]"), false);
  assert.match(nangnang, /\[Identity: NANGNANG\]/);
  assert.match(cleo, /Stay in this identity only/);
  assert.equal(systemInstructionFor(null).includes("[Identity: ZELIE]"), true);
});
