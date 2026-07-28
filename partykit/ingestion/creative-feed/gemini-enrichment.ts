import type { CreativeEntry, CreativeSource } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_INPUT_CHARS = 2_000;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

export type EnrichedCreativeEntry = CreativeEntry & {
  title: string;
  description: string;
  tags: string[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasLongVerbatimOverlap(source: string, generated: string): boolean {
  const sourceWords = normalize(source).split(" ").filter(Boolean);
  const generatedWords = normalize(generated).split(" ").filter(Boolean);
  for (let index = 0; index <= generatedWords.length - 9; index++) {
    const phrase = generatedWords.slice(index, index + 9).join(" ");
    if (sourceWords.join(" ").includes(phrase)) return true;
  }
  return false;
}

function validTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map(tag => tag.replace(/\s+/g, " ").trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 5);
}

export async function enrichWithGemini(
  entry: CreativeEntry,
  source: CreativeSource,
  env: Pick<Env, "GEMINI_API_KEY" | "GEMINI_MODEL">,
): Promise<EnrichedCreativeEntry | null> {
  if (!env.GEMINI_API_KEY?.trim()) return null;

  const sourceText = `${entry.title}\n${entry.description}`.slice(
    0,
    MAX_INPUT_CHARS,
  );
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL || DEFAULT_MODEL)}:generateContent`,
  );
  endpoint.searchParams.set("key", env.GEMINI_API_KEY);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: [
          "Act as a design-library metadata editor.",
          "Create original, high-level metadata from the source below.",
          "Never quote, paraphrase sentence-by-sentence, or reproduce any sequence of 9 or more source words.",
          "Do not mention the source publisher. Do not invent facts.",
          "Return JSON only: {title, summary, tags}.",
          "title: 8-16 words; summary: max 220 characters; tags: 3-5 concise design tags.",
          `Source category: ${source.category ?? "Creative content"}.`,
          `Source text:\n${sourceText}`,
        ].join("\n") }],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });
  if (!response.ok) return null;

  const payload = await response.json() as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const title = typeof value.title === "string"
      ? value.title.replace(/\s+/g, " ").trim().slice(0, 160)
      : "";
    const description = typeof value.summary === "string"
      ? value.summary.replace(/\s+/g, " ").trim().slice(0, 220)
      : "";
    const tags = validTags(value.tags);
    if (!title || !description || tags.length < 3) return null;
    if (hasLongVerbatimOverlap(sourceText, `${title} ${description}`)) {
      return null;
    }
    return { ...entry, title, description, tags };
  } catch {
    return null;
  }
}
