// ======================
// FILE: src/app/api/statement/route.ts
// ======================
import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Data coming from the guided interview UI
type Payload = {
  name: string;
  location: string;
  q1_images_moods: string;
  q2_viewer_feel: string;
  q3_materials_tools: string;
  q4_style_approach: string;
  q5_origin_motivation: string;
  q6_milestones: string;
  q7_personal_meaning: string;
  tone?: "plain" | "poetic" | "gallery";
};

// Output we expect back from the model
type Result = {
  statement: string; // 130–180 words
  bio: string;       // 90–130 words, third person
  tips: string[];    // finishing guidance bullets
};

function isResult(x: unknown): x is Result {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  const s = typeof v.statement === "string" && (v.statement as string).length > 20;
  const b = typeof v.bio === "string" && (v.bio as string).length > 20;
  const t = Array.isArray(v.tips) && (v.tips as unknown[]).every((i) => typeof i === "string");
  return s && b && t;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;

    const tone = body.tone ?? "plain";

    const persona = [
      "You are a creative writing assistant tailored for artists.",
      "You are supportive, insightful, and knowledgeable about art and the gallery application process.",
      "Your goal is to help artists articulate their vision and achievements clearly and effectively.",
      "Use British spelling and clear, concise language.",
      "Provide a structured format for both the Artist Statement and Artist Bio.",
      "Be encouraging and supportive."
    ].join(" ");

    const schema = {
      type: "object",
      properties: {
        statement: { type: "string", description: "130–180 words, first person, structured with short paragraphs or line breaks" },
        bio: { type: "string", description: "90–130 words, third person, suitable for websites and submissions" },
        tips: { type: "array", items: { type: "string" }, description: "3–5 short bullet tips for polishing" }
      },
      required: ["statement", "bio", "tips"]
    } as const;

    const userContext = [
      `Artist name: ${body.name || "(unknown)"}`,
      `Artist location: ${body.location || "(unknown)"}`,
      `Tone preference: ${tone}`,
      "Interview answers:",
      `1) Images/moods: ${body.q1_images_moods}`,
      `2) Viewer feel: ${body.q2_viewer_feel}`,
      `3) Materials/tools: ${body.q3_materials_tools}`,
      `4) Style/approach: ${body.q4_style_approach}`,
      `5) Origin/motivation: ${body.q5_origin_motivation}`,
      `6) Milestones: ${body.q6_milestones}`,
      `7) Personal meaning: ${body.q7_personal_meaning}`,
      "\nInstructions:",
      "- Write an Artist Statement (first person) that reflects the artist’s vision, process, and personal connection.",
      "- Write an Artist Bio (third person) that highlights journey, medium, style, influences, and notable accomplishments.",
      "- Enrich brief or general points with soft interpretation and connective language without contradicting intent.",
      "- Use British spelling. Avoid clichés, grandiosity, and buzzwords.",
      "- Include the artist’s name and location where natural (esp. in the bio).",
      "- Return STRICT JSON only matching the provided schema. Do not include any commentary.",
      "- Do NOT end with a question."
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: persona },
        { role: "user", content: `${userContext}\n\nSchema:\n${JSON.stringify(schema)}` },
      ],
      max_tokens: 900,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    if (!isResult(parsed)) {
      return new Response(
        JSON.stringify({ error: "Unexpected format from model.", debug: text.slice(0, 2000) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

