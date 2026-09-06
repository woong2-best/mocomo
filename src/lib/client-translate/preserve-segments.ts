/** Split post text so URLs, hashtags, and @mentions stay untranslated. */
const PRESERVE_RE = /(https?:\/\/\S+|#[\w\u0080-\uFFFF]+|@[\w\u0080-\uFFFF]+)/g;

export type TextSegment =
  | { kind: "text"; value: string }
  | { kind: "preserve"; value: string };

export function splitTranslatableSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  PRESERVE_RE.lastIndex = 0;
  while ((match = PRESERVE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ kind: "preserve", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ kind: "text", value: text });
  }

  return segments;
}

export function joinTranslatedSegments(
  segments: TextSegment[],
  translatedParts: Map<number, string>
): string {
  let textIndex = 0;
  return segments
    .map((segment) => {
      if (segment.kind === "preserve") return segment.value;
      const translated = translatedParts.get(textIndex);
      textIndex += 1;
      return translated ?? segment.value;
    })
    .join("");
}
