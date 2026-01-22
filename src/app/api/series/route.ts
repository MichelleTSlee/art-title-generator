import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Payload = {
  imageDataUrl: string;
};

type SeriesIdea = {
  title: string;
  description: string;
  practical_note: string;
};

type SeriesResult = {
  opening: string;
  ideas: SeriesIdea[];
  closing: string;
};

function isSeriesResult(value: unknown): value is SeriesResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  
  const openingOk = typeof v.opening === "string" && v.opening.length > 50;
  const closingOk = typeof v.closing === "string" && v.closing.length > 20;
  
  const ideas = v.ideas;
  if (!Array.isArray(ideas) || ideas.length !== 5) return false;
  
  const ideasOk = ideas.every((idea) => {
    if (!idea || typeof idea !== "object") return false;
    const i = idea as Record<string, unknown>;
    return (
      typeof i.title === "string" &&
      i.title.length > 3 &&
      typeof i.description === "string" &&
      i.description.length > 30 &&
      typeof i.practical_note === "string" &&
      i.practical_note.length > 20
    );
  });
  
  return openingOk && closingOk && ideasOk;
}

function buildSchema() {
  return {
    type: "object",
    properties: {
      opening: {
        type: "string",
        description: "A short paragraph (3-5 sentences) appreciating the painting's overall feeling, atmosphere, visual elements (colours, shapes, textures, mark-making, composition, light, contrast), and what they might suggest about mood or themes.",
      },
      ideas: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        description: "Exactly five series or theme ideas.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "A descriptive title or phrase for the series idea.",
            },
            description: {
              type: "string",
              description: "2-3 sentences explaining how the idea connects to the work.",
            },
            practical_note: {
              type: "string",
              description: "A short, practical note on how the artist might approach it: variations, materials, composition, techniques, or moods they could play with.",
            },
          },
          required: ["title", "description", "practical_note"],
          additionalProperties: false,
        },
      },
      closing: {
        type: "string",
        description: "A kind reminder that these ideas are jumping-off points (1-2 sentences).",
      },
    },
    required: ["opening", "ideas", "closing"],
    additionalProperties: false,
  } as const;
}

function buildSystemPrompt() {
  return [
    "You are a warm, perceptive studio companion for abstract and expressive artists.",
    "You stand alongside the artist, observing a single painting with genuine curiosity and care.",
    "Your purpose is to help the artist see what's there, uncover deeper layers of meaning, and imagine 5 thoughtful series ideas — each one with enough detail to feel real and inspiring.",
    "",
    "You speak clearly, naturally, and always with a supportive tone.",
    "Your words are encouraging but grounded — you balance emotional insight with small practical suggestions, so the artist can see how these ideas could grow.",
    "",
    "RESPONSE FORMAT:",
    "- Total length: around 300–400 words.",
    "- Open with a short paragraph (3-5 sentences) appreciating the painting's overall feeling and standout qualities.",
    "- Describe the atmosphere and note specific visual elements: colours, shapes, textures, mark-making, composition, light, and contrast.",
    "- Gently interpret what these might suggest about mood or themes — always keep it open, not rigid.",
    "- Then offer 5 series or theme ideas, each with:",
    "  • A descriptive title or phrase",
    "  • 2–3 sentences that explain how the idea connects to the work",
    "  • A short, practical note on how the artist might approach it: variations, materials, composition, techniques, or moods they could play with",
    "- Close with a kind reminder that these ideas are jumping-off points.",
    "",
    "KEY PRINCIPLES:",
    "✔️ Specific, not vague — connect each idea back to the original painting.",
    "✔️ Include practical cues: techniques, materials, or compositional thoughts.",
    "✔️ Supportive tone — gentle, clear, and never patronising.",
    "✔️ British spelling throughout (colour, centre, grey, etc.).",
    "✔️ End with an encouraging reminder that the artist is free to adapt, combine, or ignore these ideas.",
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
      text: "Analyse this artwork and provide thoughtful series ideas following the specified format.",
    },
    { type: "image_url", image_url: { url: imageDataUrl } },
    {
      type: "text",
      text:
        `${preface}\n${JSON.stringify(schema)}\n` +
        "Constraints:\n" +
        "- 300–400 words total.\n" +
        "- British spelling (colour, centre, grey).\n" +
        "- Exactly 5 series ideas.\n" +
        "- Each idea must include: title, description (2-3 sentences), and practical note.\n" +
        "- Be specific to this artwork, not generic.\n" +
        "- Supportive and encouraging tone throughout.\n",
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
    if (!isSeriesResult(parsed)) {
      text = await callModel(imageDataUrl, schema, true);
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!isSeriesResult(parsed)) {
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
