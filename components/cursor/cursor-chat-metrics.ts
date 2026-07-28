export const cursorChatMetrics = {
  gapX: 2.75,
  gapY: 0.75,
  maxWidth: 22.5,
  minInputWidth: 9.375,
  inputHeight: 2,
  viewportPadding: 0.75,
  horizontalFlipZone: 13.75,
  verticalFlipZone: 5.625,
} as const;

export function rootRemSize(): number {
  if (typeof window === "undefined") return 16;
  const value = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(value) && value > 0 ? value : 16;
}

export function remToPixels(value: number, rootSize = rootRemSize()): number {
  return value * rootSize;
}

export function pixelsToRem(value: number, rootSize = rootRemSize()): string {
  return `${value / rootSize}rem`;
}
