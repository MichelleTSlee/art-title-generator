import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Payload = {
  imageDataUrl?: string;
  description?: string;
};

type ArtistMatch = {
  name: string;
  visual_connection: string;
  suggestion: string;
};

type WhoResult = {
  artists: ArtistMatch[];
};

function isWhoResult(value: unknown): value is WhoResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  
  const artists = v.artists;
  if (!Array.isArray(artists) || artists.length < 4 || artists.length > 5) return false;
  
  const artistsOk = artists.every((artist) => {
    if (!artist || typeof artist !== "object") return false;
    const a = artist as Record<string, unknown>;
    return (
      typeof a.name === "string" &&
      a.name.length > 2 &&
      typeof a.visual_connection === "string" &&
      a.visual_connection.length > 50 &&
      typeof a.suggestion === "string" &&
      a.suggestion.length > 20
    );
  });
  
  return artistsOk;
}

function buildSchema() {
  return {
    type: "object",
    properties: {
      artists: {
        type: "array",
        minItems: 4,
        maxItems: 5,
        description: "4-5 artists whose work shows strong visual and material similarities.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The artist's name (and optionally, a specific series or period if relevant).",
            },
            visual_connection: {
              type: "string",
              description: "A clear explanation of what looks similar and how — be specific about surface and material traits. Use plain language.",
            },
            suggestion: {
              type: "string",
              description: "One thing the artist does that the user could explore or reflect on.",
            },
          },
          required: ["name", "visual_connection", "suggestion"],
          additionalProperties: false,
        },
      },
    },
    required: ["artists"],
    additionalProperties: false,
  } as const;
}

function buildSystemPrompt() {
  return [
    "You are a perceptive, visually focused art discovery companion for expressive, intuitive artists.",
    "You specialise in recognising artists — both historical and contemporary — whose work visually and materially resembles a user's painting in clear, tangible ways.",
    "",
    "Your job is to suggest artists whose art shows strong surface-level visual kinship, including similarities in mark-making, texture, layering approach, paint handling, compositional energy, and overall material sensibility.",
    "Emotional tone matters, but only when supported by obvious visual echoes.",
    "",
    "Your tone is clear, practical, and respectful — never overreaching or poetic. You don't try to force connections or make abstract leaps.",
    "You give grounded, easy-to-see reasons for each artist suggestion so the user doesn't have to search hard to understand the match.",
    "",
    "MATCHING PRIORITIES:",
    "Only suggest artists whose work has clear visual and material overlap. Prioritise:",
    "- Mark-making: e.g. gestural, scratched, smeared, fine, repetitive, raw",
    "- Materiality: e.g. oil impasto, cold wax layering, collage, scraping back",
    "- Texture and surface: matte, rough, glossy, veiled, built-up",
    "- Compositional feel: dense and central, open and drifting, atmospheric, fragmented",
    "- Paint handling: e.g. wet-on-wet blending, palette knife, dry dragging, staining",
    "- Overall visual atmosphere: not just emotion, but how it looks and feels on the surface",
    "",
    "⚠️ Do not suggest artists based solely on a single colour, theme, or emotion if there is no strong visual or material similarity.",
    "If no strong match can be found, it's better to skip than force a suggestion.",
    "",
    "HOW TO RESPOND:",
    "For each artist you suggest:",
    "- Clearly explain what looks similar and how — be specific about surface and material traits",
    "- Use plain language: 'Like your painting, X uses scraped-back layers and blurred colour boundaries'",
    "- Suggest 1 thing the artist does that the user could explore or reflect on",
    "",
    "Include 4-5 artists per response.",
    "Ensure a diverse mix of artists, but only when there is a real visual or material reason for the match.",
    "Use British spelling (colour, centre, grey, etc.).",
  ].join("\n");
}

async function callModel(
  imageDataUrl: string | undefined,
  description: string | undefined,
  schema: unknown,
  strict: boolean
): Promise<string> {
  const system = buildSystemPrompt();
  const preface = strict
    ? "You MUST output ONLY valid JSON matching this schema (no extra text):"
    : "Output JSON ONLY matching this schema:";

  const content: ChatCompletionContentPart[] = [];

  if (imageDataUrl) {
    content.push({
      type: "text",
      text: "Analyse this artwork and suggest artists with strong visual and material similarities.",
    });
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  if (description) {
    content.push({
      type: "text",
      text: `The user describes their painting as: "${description}"\n\nSuggest artists with strong visual and material similarities.`,
    });
  }

  content.push({
    type: "text",
    text:
      `${preface}\n${JSON.stringify(schema)}\n` +
      "Constraints:\n" +
      "- British spelling (colour, centre, grey).\n" +
      "- 4-5 artists total.\n" +
      "- Each artist must include: name, visual_connection (specific surface/material traits), and suggestion.\n" +
      "- Be specific and grounded. No forced connections.\n" +
      "- Only suggest artists with clear visual overlap.\n",
  });

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
    const { imageDataUrl, description } = (await req.json()) as Payload;

    if (!imageDataUrl && !description?.trim()) {
      return new Response(
        JSON.stringify({ error: "Please provide either an image or a description" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const schema = buildSchema();

    // First attempt
    let text = await callModel(imageDataUrl, description, schema, false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }

    // If invalid, retry strictly
    if (!isWhoResult(parsed)) {
      text = await callModel(imageDataUrl, description, schema, true);
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!isWhoResult(parsed)) {
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
