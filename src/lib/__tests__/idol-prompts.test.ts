import test from "node:test";
import assert from "node:assert/strict";
import { AIRI_PROMPT, CHLOE_PROMPT, STELLA_PROMPT, promptForCharacter } from "@/constants/prompts";
import { systemInstructionFor } from "@/lib/ai-live/host-reply";

test("each idol has a distinct persona prompt", () => {
  assert.equal(promptForCharacter("airi"), AIRI_PROMPT);
  assert.equal(promptForCharacter("CHLOE"), CHLOE_PROMPT);
  assert.equal(promptForCharacter("stella"), STELLA_PROMPT);
  assert.notEqual(AIRI_PROMPT, CHLOE_PROMPT);
  assert.notEqual(CHLOE_PROMPT, STELLA_PROMPT);
  assert.match(AIRI_PROMPT, /\[Identity: AIRI\]/);
  assert.match(CHLOE_PROMPT, /\[Identity: CHLOE\]/);
  assert.match(STELLA_PROMPT, /\[Identity: STELLA\]/);
  assert.match(AIRI_PROMPT, /귀요미/);
  assert.match(CHLOE_PROMPT, /마미/);
  assert.match(STELLA_PROMPT, /자본주의/);
});

test("Gemini system instruction stays on one identity", () => {
  const airi = systemInstructionFor("airi");
  const chloe = systemInstructionFor("chloe");
  const stella = systemInstructionFor("stella");
  assert.match(airi, /\[Identity: AIRI\]/);
  assert.equal(airi.includes("[Identity: CHLOE]"), false);
  assert.match(chloe, /\[Identity: CHLOE\]/);
  assert.equal(chloe.includes("[Identity: AIRI]"), false);
  assert.match(stella, /\[Identity: STELLA\]/);
  assert.match(airi, /Stay in this identity only/);
  assert.equal(systemInstructionFor(null).includes("[Identity: MOCO]"), true);
});
