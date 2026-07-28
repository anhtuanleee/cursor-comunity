export function readableTextColor(hex: string): "#000000" | "#FFFFFF" {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) return "#FFFFFF";

  const channels = [0, 2, 4].map(index => {
    const channel = Number.parseInt(normalized.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.45 ? "#000000" : "#FFFFFF";
}
