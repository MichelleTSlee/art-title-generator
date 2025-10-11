import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Payload = {
  imageDataUrl: string;   // data:image/...;base64,...
  notes?: string;         // optional artist notes
};

type AbstractPath = {
  level: 1 | 2 | 3 | 4 | 5;   // abstraction intensity for THIS path
  label: string;
  what_to_do: string;
  why_interesting: string;
  prompts?: {
    surface?: string;
    materials?: string;
    try?: string;
    palette_cue?: string;
  };
};

type AbstractifierResult = {
  brief_read: string;          // 2–4 sentences
  paths: AbstractPath[];       // exactly 5 (levels 1..5)
  closing_line: string;        // no question
};

function isResult(x: unknown): x is AbstractifierResult {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  const briefOk = typeof v.brief_read === "string" && (v.brief_read as string).length > 20;
  const closingOk = typeof v.closing_line === "string" && (v.closing_line as string).length > 5;
  const paths = v.paths;
  if (!Array.isArray(paths) || paths.length !== 5) return false;

  const levels = new Set<number>();
  const pathOk = paths.every((p) => {
    if (!p || typeof p !== "object") return false;
    const o = p as Record<string, unknown>;
    const levelVal = o.level as number;
    levels.add(levelVal);
    const labelOk = typeof o.label === "string";
    const wtdOk = typeof o.what_to_do === "string";
    const whyOk = typeof o.why_interesting === "string";
    const prompts = o.prompts;
    const promptsOk =
      prompts === undefined ||
      (typeof prompts === "object" &&
        prompts !== null &&
        Object.values(prompts as Record<string, unknown>).every(
          (v) => v === undefined || typeof v === "string"
        ));
    return (
      [1, 2, 3, 4, 5].includes(levelVal) &&
      labelOk &&
      wtdOk &&
      whyOk &&
      promptsOk
    );
  });

  // Must cover all five distinct levels 1..5
  const levelsOk = [1, 2, 3, 4, 5].every((n) => levels.has(n));
  return briefOk && closingOk && pathOk && levelsOk;
}

function buildSchema() {
  return {
    type: "object",
    properties: {
      brief_read: {
        type: "string",
        description: "2–4 sentences naming notable visual/mood cues (light direction, horizon, contrast, repeated marks, season, etc.)",
      },
      paths: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        description: "Exactly five distinct abstraction paths, one per level 1..5.",
        items: {
          type: "object",
          properties: {
            level: { type: "integer", enum: [1, 2, 3, 4, 5] },
            label: { type: "string" },
            what_to_do: { type: "string" },
            why_interesting: { type: "string" },
            prompts: {
              type: "object",
              properties: {
                surface: { type: "string" },
                materials: { type: "string" },
                try: { type: "string" },
                palette_cue: { type: "string" },
              },
              additionalProperties: false,
            },
          },
          required: ["level", "label", "what_to_do", "why_interesting"],
          additionalProperties: false,
        },
      },
      closing_line: { type: "string" },
    },
    required: ["brief_read", "paths", "closing_line"],
    additionalProperties: false,
  } as const;
}

function personaAndRules(userNotes: string) {
  return [
    "You are an intuitive, imaginative studio assistant who helps artists turn real landscape photos into expressive abstract paintings.",
    "Notice shape, structure, colour shifts, texture, light, rhythm, atmosphere, and emotional undercurrents.",
    "Offer image-specific, practical painting moves. Tone is warm, plain, encouraging. British spelling. No waffle.",
    "",
    "CORE OUTPUT:",
    "- Brief read (2–4 sentences).",
    "- 5 distinct abstraction paths covering levels 1,2,3,4,5 (one per level).",
    "- Each path: label; what to do; why it’s interesting; optional quick prompts (Surface/Materials/Try/Palette cue).",
    "- 300–450 words total. Do not end with a question.",
    "",
    "LEVEL DEFINITIONS:",
    "1 Subtle — preserve horizon/structure; small palette/edge shifts.",
    "2 Gentle — simplify shapes; keep recognisable cues; modest crop/palette change.",
    "3 Balanced — 3–6 big shapes; faint sense of place; one bold structural move.",
    "4 Strong — discard literal detail; emphasise rhythms/edges/values; crop/rotate allowed.",
    "5 Bold — no literal horizon/trees; compress into fields/bands; radical palette/value moves.",
    "",
    "VARIATION RULES:",
    "- Vary order of suggestion types and opening verbs (Push, Strip back, Block in, Flood, Score, Repeat, Drift, Scrape, Layer, Mask, Flip vertically, Invert values, Glaze, Stain, Roll, Press).",
    "- Do not repeat the same descriptive word across all 5; avoid: whisper, echo, veil, beneath, solitude.",
    "- Choose wild cards that relate to the actual photo (tidal marks, hedgerow grids, weather bands, erosion lines, field boundaries, fog, light gaps, reflection).",
    "- Replace generic phrasing with specific moves tied to the image.",
    "",
    userNotes ? `ARTIST NOTES: ${userNotes}` : "No additional artist notes provided.",
  ].join("\n");
}

async function callModel(
  imageDataUrl: string,
  userNotes: string,
  schema: unknown,
  strict: boolean
) {
  const system = personaAndRules(userNotes);
  const preface = strict
    ? "You MUST output ONLY valid JSON matching this schema (no extra text):"
    : "Output JSON ONLY matching this schema:";

  const content: ChatCompletionContentPart[] = [
    { type: "text", text: "Analyse the image and produce the specified outputs." },
    { type: "image_url", image_url: { url: imageDataUrl } },
    {
      type: "text",
      text:
        `${preface}\n${JSON.stringify(schema)}\n` +
        "Constraints:\n" +
        "- 300–450 words total.\n" +
        "- British spelling (colour, centre, grey).\n" +
        "- Cover all five levels: exactly one path each at 1,2,3,4,5.\n" +
        "- No questions at the end.\n" +
        "- Obey variation and repetition guardrails.\n",
    },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    presence_penalty: 0.2,
    frequency_penalty: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    max_tokens: 900,
  });

  return completion.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, notes = "" } = (await req.json()) as Payload;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Missing or invalid image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const schema = buildSchema();

    // First pass
    let text = await callModel(imageDataUrl, notes, schema, false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* ignore */
    }

    // If invalid, retry strictly
    if (!isResult(parsed)) {
      text = await callModel(imageDataUrl, notes, schema, true);
      try {
        parsed = JSON.parse(text);
      } catch {
        /* ignore */
      }
    }

    if (!isResult(parsed)) {
      return new Response(
        JSON.stringify({
          error: "Unexpected format from model.",
          debug: typeof text === "string" ? text.slice(0, 4000) : "(no content)",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
