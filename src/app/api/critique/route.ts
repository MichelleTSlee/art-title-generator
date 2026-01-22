import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Payload = {
  imageDataUrl: string;
};

type CritiqueResult = {
  opening: string;
  suggestions: string[];
  closing: string;
};

function isCritiqueResult(value: unknown): value is CritiqueResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  
  const openingOk = typeof v.opening === "string" && v.opening.length > 50;
  const closingOk = typeof v.closing === "string" && v.closing.length > 15;
  
  const suggestions = v.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length < 3 || suggestions.length > 5) return false;
  
  const suggestionsOk = suggestions.every((s) => typeof s === "string" && s.length > 30);
  
  return openingOk && closingOk && suggestionsOk;
}

function buildSchema() {
  return {
    type: "object",
    properties: {
      opening: {
        type: "string",
        description: "A sincere, detailed appreciation of the piece. Mention emotional tone, visual energy, or atmosphere. Highlight specific visual elements. Vary phrasing to make each reflection feel newly observed.",
      },
      suggestions: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        description: "3-5 clearly explained suggestions for what the artist might try next. Each should be specific to the image, give a concrete 'why' or 'what it might do', and offer a creative prompt or visual tweak that's easy to test.",
        items: {
          type: "string",
          description: "A specific, practical suggestion with explanation.",
        },
      },
      closing: {
        type: "string",
        description: "A brief, encouraging statement — plainspoken and gently affirming. No questions.",
      },
    },
    required: ["opening", "suggestions", "closing"],
    additionalProperties: false,
  } as const;
}

function buildSystemPrompt() {
  return [
    "You are a perceptive, supportive critique companion for emotionally expressive abstract artists.",
    "You offer thoughtful reflections and practical, encouraging suggestions — as if standing beside the artist in their studio.",
    "",
    "Your role is to affirm what's working, reflect on what the piece evokes, and suggest meaningful ways to explore or push the work further.",
    "Your feedback is always clear, artist-to-artist, with a tone that is curious, kind, and creatively energising.",
    "",
    "You focus on:",
    "- Mood, emotion, and atmosphere",
    "- Composition, shape, and balance",
    "- Mark-making, edges, and layering",
    "- Colour, contrast, and flow",
    "- Materials, surface, and gesture",
    "",
    "STRUCTURE (250–400 words):",
    "",
    "1. OPENING RESPONSE (no heading):",
    "Start with a sincere, detailed appreciation of the piece.",
    "- Mention emotional tone, visual energy, or atmosphere",
    "- Highlight specific visual elements (e.g. 'soft drybrush textures,' 'a halo of burnt sienna,' 'jagged verticals pulling the eye upward')",
    "- Vary your phrasing — make each reflection feel newly observed",
    "",
    "2. PRACTICAL SUGGESTIONS FOR DEVELOPMENT (3–5 items):",
    "Offer 3–5 clearly explained suggestions for what the artist might try next — in this piece or a future one. Each point should:",
    "- Be specific to the image",
    "- Give a concrete 'why' or 'what it might do'",
    "- Offer a creative prompt or visual tweak that's easy to test",
    "",
    "Examples of effective suggestions:",
    "- 'Soften the transitions between light and dark areas. This could create a stronger sense of depth and flow, especially in the upper third where contrasts currently feel abrupt.'",
    "- 'Introduce a counter-rhythm. The repeated diagonal marks are dynamic — you might balance them by adding one or two slower, broader shapes that pull the eye in another direction.'",
    "- 'Try a limited colour remix. What happens if you remake this painting using only the raw umber, cobalt blue, and white? It could bring fresh clarity while deepening emotional resonance.'",
    "- 'Let one section breathe. The lower left has compelling textures — what if you gave them more space by simplifying the surrounding marks?'",
    "- 'Flip the composition and respond to it anew. Sometimes a fresh orientation unlocks surprising balance or new emotional undertones.'",
    "",
    "3. CLOSING NOTE (no heading):",
    "Wrap up with a brief, encouraging statement — plainspoken and gently affirming.",
    "",
    "Examples:",
    "- 'There's something real unfolding here — trust that momentum.'",
    "- 'Let the edges stay loose if they want to — the energy is in the becoming.'",
    "- 'You're on to something — keep going with quiet confidence.'",
    "",
    "REMINDERS:",
    "- Use British spelling (colour, centre, grey, etc.)",
    "- Avoid generic or poetic praise — be precise and thoughtful",
    "- Speak like a trusted artist friend — perceptive, supportive, but never fluffy",
    "- Don't ask questions or end with one",
    "- Keep suggestions realistic and playful, not technical or rigid",
  ].join("\n");
}

async function callModel(
  imageDataUrl: string,
  schema: unknown,
  strict: boolean
): Promise<string> {
  const system = buildSystemPrompt();
  const preface = strict
    ? "You MUST output ONLY valid JSON matching this schema (no extra text):"
    : "Output JSON ONLY matching this schema:";

  const content: ChatCompletionContentPart[] = [
    {
      type: "text",
      text: "Analyse this artwork and provide a thoughtful critique following the specified format.",
    },
    { type: "image_url", image_url: { url: imageDataUrl } },
    {
      type: "text",
      text:
        `${preface}\n${JSON.stringify(schema)}\n` +
        "Constraints:\n" +
        "- 250–400 words total.\n" +
        "- British spelling (colour, centre, grey).\n" +
        "- 3-5 practical suggestions.\n" +
        "- Be specific to this artwork.\n" +
        "- Supportive, curious, and creatively energising tone.\n" +
        "- No questions at the end.\n",
    },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    max_tokens: 1000,
  });

  return completion.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl } = (await req.json()) as Payload;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Missing or invalid image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const schema = buildSchema();

    // First attempt
    let text = await callModel(imageDataUrl, schema, false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }

    // If invalid, retry strictly
    if (!isCritiqueResult(parsed)) {
      text = await callModel(imageDataUrl, schema, true);
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!isCritiqueResult(parsed)) {
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
