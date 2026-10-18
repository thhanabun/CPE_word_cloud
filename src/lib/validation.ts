export function normalizeAnswer(input: unknown) {
  if (typeof input !== "string" || input.length > 1024) return null;
  const displayText = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!displayText) return null;
  const segments = new Intl.Segmenter("th", { granularity: "grapheme" });
  const length = [...segments.segment(displayText)].length;
  if (length > 80) return null;
  return {
    displayText,
    normalizedText: displayText.toLocaleLowerCase("th"),
  };
}

export function isText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}
