/** AIRI uses VOICEVOX No.7 (normal). Engine speaker id 29. */
export const AIRI_VOICEVOX_SPEAKER = 29;

/** Required on-screen credit when No.7 is used. */
export const VOICEVOX_NO7_CREDIT = "Voice by VOICEVOX:No.7";

export function usesVoicevox(characterId: string | null | undefined): boolean {
  return characterId?.trim().toLowerCase() === "airi";
}
