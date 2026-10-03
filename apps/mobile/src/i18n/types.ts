/** Translator signature shared by components, helper modules and the runtime. */
export type TFn = (key: string, vars?: Record<string, string>) => string;
