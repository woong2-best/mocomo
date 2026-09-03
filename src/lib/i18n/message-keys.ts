/** Message keys derived from English catalog (source of truth). */
import en from "./locales/en.json";

export type MessageKey = keyof typeof en;

export const MESSAGE_KEYS = Object.keys(en) as MessageKey[];
