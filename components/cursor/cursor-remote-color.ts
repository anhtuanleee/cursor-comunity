const REMOTE_CURSOR_COLORS = [
  "#0F766E",
  "#2563EB",
  "#7C3AED",
  "#C2410C",
  "#BE123C",
  "#4D7C0F",
  "#0369A1",
  "#A21CAF",
  "#B45309",
  "#4338CA",
] as const;

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

/** Assign stable, distinct colors for the current room snapshot. */
export function assignRemoteCursorColors(
  userIds: string[],
  ownColor?: string,
) {
  const assigned = new Set<string>(ownColor ? [ownColor.toUpperCase()] : []);
  const colors = new Map<string, string>();
  const sortedIds = [...userIds].sort();

  for (const userId of sortedIds) {
    const start = hash(userId) % REMOTE_CURSOR_COLORS.length;
    let color = REMOTE_CURSOR_COLORS[start];
    for (let offset = 0; offset < REMOTE_CURSOR_COLORS.length; offset += 1) {
      const candidate = REMOTE_CURSOR_COLORS[
        (start + offset) % REMOTE_CURSOR_COLORS.length
      ];
      if (!assigned.has(candidate)) {
        color = candidate;
        break;
      }
    }
    assigned.add(color);
    colors.set(userId, color);
  }

  return colors;
}
