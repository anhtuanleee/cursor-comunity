const ADJECTIVES = ["Swift", "Brave", "Calm", "Wise", "Bold", "Cool", "Keen", "Wild", "Free", "Pure", "Rare", "Fine", "Neat", "Warm", "Fair", "Bright"];
const NOUNS = ["Fox", "Owl", "Bear", "Wolf", "Hawk", "Deer", "Lynx", "Dove", "Wren", "Jay", "Fin", "Ray", "Elk", "Yak", "Bee", "Cat"];
const COLORS = ["#E11D48", "#7C3AED", "#2563EB", "#0891B2", "#059669", "#D97706", "#DC2626", "#4F46E5", "#0D9488", "#9333EA", "#0284C7", "#65A30D"];

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface UserIdentity {
  id: string;
  name: string;
  color: string;
}

export function createUser(existingNames?: string[]): UserIdentity {
  const usedNames = new Set(existingNames || []);
  let name: string;
  do { name = `${getRandom(ADJECTIVES)} ${getRandom(NOUNS)}`; } while (usedNames.has(name));
  return { id: generateId(), name, color: getRandom(COLORS) };
}

let tabUserId: string | null = null;

export function getOrCreateUserId(): string {
  // Each browser tab is a separate realtime participant. Persisting this ID in
  // localStorage makes every tab look like the same user and hides its cursor.
  if (!tabUserId) tabUserId = generateId();
  return tabUserId;
}
