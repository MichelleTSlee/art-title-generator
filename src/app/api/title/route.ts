import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Payload = {
  imageDataUrl: string;
  tone?: "poetic" | "cinematic" | "minimal" | "lyrical" | "mysterious";
  keywords?: string;
};

type TopRationale = { title: string; why_it_fits: string };
type TitleResult = {
  tone: string;
  titles: string[];
  top_rationales: TopRationale[];
  tags: string[];
};

function isTitleResult(value: unknown): value is TitleResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const toneOk = typeof v.tone === "string";
  const titlesOk =
    Array.isArray(v.titles) && v.titles.every((t) => typeof t === "string");
  const trOk =
    Array.isArray(v.top_rationales) &&
    v.top_rationales.every(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof (r as Record<string, unknown>).title === "string" &&
        typeof (r as Record<string, unknown>).why_it_fits === "string"
    );
  const tagsOk =
    Array.isArray(v.tags) && v.tags.every((t) => typeof t === "string");
  return toneOk && titlesOk && trOk && tagsOk;
}

function buildSchema() {
  return {
    type: "object",
    properties: {
      tone: { type: "string" },
      titles: { type: "array", items: { type: "string" }, minItems: 12, maxItems: 12 },
      top_rationales: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            why_it_fits: { type: "string" },
          },
          required: ["title", "why_it_fits"],
        },
        minItems: 3,
        maxItems: 3,
      },
      tags: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 7 },
    },
    required: ["tone", "titles", "top_rationales", "tags"],
  };
}

async function callModel(
  imageDataUrl: string,
  userPrompt: string,
  schema: unknown,
  strictJSON: boolean
): Promise<string> {
  const systemPrompt = [
    "You are an art titling assistant specialising in abstract landscapes.",
    "Use UK spelling. Titles must be 1–5 words, evocative but not cliché.",
    "Avoid overused words such as 'Ethereal', 'Serenity', 'Dreamscape', or 'Untitled'.",
    "Lean into atmosphere, season, movement, and quiet narrative hints.",
    "Return STRICT JSON only; no commentary."
  ].join(" ");

  const preface = strictJSON
    ? "You MUST output ONLY valid JSON matching this schema (no extra text):"
    : "Output JSON ONLY following this schema:";

  const content: ChatCompletionContentPart[] = [
    { type: "text", text: userPrompt },
    { type: "image_url", image_url: { url: imageDataUrl } },
    {
      type: "text",
      text:
        `${preface}\n` +
        JSON.stringify(schema) +
        "\nRules:\n" +
        "- Titles must be 1–5 words.\n" +
        "- No punctuation at the end.\n" +
        "- Avoid colour names unless essential.\n" +
        "- Ensure variety of rhythm and imagery.",
    },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
    max_tokens: 700,
  });

  return completion.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { imageDataUrl, tone = "poetic", keywords = "" } = body as Payload;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Missing or invalid image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if image data URL is too large (e.g., > 10MB)
    if (imageDataUrl.length > 10_000_000) {
      return new Response(JSON.stringify({ error: "Image too large. Please use a smaller image." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const schema = buildSchema();
    const userPrompt = [
      `Preferred tone: ${tone}`,
      keywords ? `Artist-provided keywords: ${keywords}` : "No additional keywords.",
      "Analyse the artwork’s mood, palette, edges, movement, and atmosphere, then propose titles.",
    ].join("\n");

    // First attempt (normal)
    let text = await callModel(imageDataUrl, userPrompt, schema, false);
    let parsed: unknown;
    try { 
      parsed = JSON.parse(text); 
    } catch (parseError) { 
      console.error("JSON parse error (first attempt):", parseError);
      parsed = undefined; 
    }

    // If invalid, retry with stricter JSON instruction
    if (!isTitleResult(parsed)) {
      text = await callModel(imageDataUrl, userPrompt, schema, true);
      try { 
        parsed = JSON.parse(text); 
      } catch (parseError) { 
        console.error("JSON parse error (second attempt):", parseError);
        parsed = undefined; 
      }
    }

    if (!isTitleResult(parsed)) {
      const payload = {
        error: "The model returned an unexpected format.",
        debug: typeof text === "string" ? text.slice(0, 4000) : "(no content)"
      };
      return new Response(JSON.stringify(payload), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Title API error:", e);
    let message = "Unexpected server error";
    
    if (e instanceof Error) {
      message = e.message;
      // Check for specific OpenAI or network errors
      if (message.includes("Invalid")) {
        message = `Image processing error: ${message}`;
      }
    }
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
