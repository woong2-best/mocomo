/** Protect placeholders, brand, and common non-translatable tokens during UI ML Kit passes. */
const UI_PRESERVE_RE =
  /(\{[a-zA-Z0-9_]+\}|MoCoMo|MOCO|\$[\d,.]+|€[\d,.]+|£[\d,.]+|¥[\d,.]+|₩[\d,.]+|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/g;

export type UiSegment =
  | { kind: "text"; value: string }
  | { kind: "preserve"; value: string };

export function splitUiTranslatableSegments(text: string): UiSegment[] {
  const segments: UiSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  UI_PRESERVE_RE.lastIndex = 0;
  while ((match = UI_PRESERVE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ kind: "preserve", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }
  if (segments.length === 0) segments.push({ kind: "text", value: text });
  return segments;
}

export function joinUiTranslatedSegments(
  segments: UiSegment[],
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
