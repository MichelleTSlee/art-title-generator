// ======================
// FILE: src/app/statement/page.tsx
// ======================
"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";

// ---- Strong types for questions/answers ----
type QKey =
  | "q1_images_moods"
  | "q2_viewer_feel"
  | "q3_materials_tools"
  | "q4_style_approach"
  | "q5_origin_motivation"
  | "q6_milestones"
  | "q7_personal_meaning";

type Question = {
  key: QKey;
  label: string;
  placeholder: string;
};

const QUESTIONS: readonly Question[] = [
  {
    key: "q1_images_moods",
    label: "What kinds of images, ideas or moods keep showing up in your work?",
    placeholder: "e.g., tidal flats, weathered light, memory, edges of places",
  },
  {
    key: "q2_viewer_feel",
    label:
      "If someone stood in front of your work, what do you want them to feel or reflect on?",
    placeholder: "e.g., quiet, spaciousness, nostalgia, breath, calm intensity",
  },
  {
    key: "q3_materials_tools",
    label: "What materials, tools or techniques do you enjoy using and why?",
    placeholder: "e.g., acrylics, oils, brayer for soft veils, palette knife for edges",
  },
  {
    key: "q4_style_approach",
    label: "How would you describe your overall style or approach?",
    placeholder: "e.g., abstract landscapes, atmospheric, gestural, layered glazes",
  },
  {
    key: "q5_origin_motivation",
    label: "What inspired you to start and what keeps you coming back now?",
    placeholder: "e.g., coastal upbringing, walking, weather patterns, journalling",
  },
  {
    key: "q6_milestones",
    label: "Any key milestones, exhibitions, collectors or special moments so far?",
    placeholder:
      "e.g., 2023 solo show, group exhibitions, pieces in private collections",
  },
  {
    key: "q7_personal_meaning",
    label:
      "What does your art mean to you personally and what role does it play in your life?",
    placeholder:
      "e.g., a way to slow down, to hold memories in colour and light",
  },
] as const;

type Tone = "plain" | "poetic" | "gallery";

type Answers = {
  name: string;
  location: string;
  tone: Tone;
} & Record<QKey, string>;

type ApiResult = { statement: string; bio: string; tips: string[] };

// ---- Small helper to avoid `any` in error handling ----
type ErrorPayload = { error: unknown };
function hasErrorPayload(x: unknown): x is ErrorPayload {
  return typeof x === "object" && x !== null && "error" in x;
}

export default function StatementPage() {
  // -1 = intro (name/location/tone), then 0..6 = questions
  const [step, setStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<Answers>({
    name: "",
    location: "",
    tone: "plain",
    q1_images_moods: "",
    q2_viewer_feel: "",
    q3_materials_tools: "",
    q4_style_approach: "",
    q5_origin_motivation: "",
    q6_milestones: "",
    q7_personal_meaning: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);

  const [copiedKey, setCopiedKey] = useState<null | "statement" | "bio">(null);

async function copyTextSafe(key: "statement" | "bio", text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  } catch {
    // Optional: you could set an error state here if you like
  }
}

  

  const current: Question | null = useMemo(
    () => (step >= 0 && step < QUESTIONS.length ? QUESTIONS[step] : null),
    [step]
  );

  function setField<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch("/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data: unknown = await resp.json();

      if (!resp.ok) {
        const errMsg = hasErrorPayload(data) ? String(data.error) : "Request failed";
        throw new Error(errMsg);
      }

      setResult(data as ApiResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6 bg-white text-gray-900">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Artist Statement & Bio</h1>
      <p className="text-sm text-gray-700 mb-4">
        A short series of questions to generate a draft artist statement and bio.
      </p>

      {/* INTRO STEP: name/location/tone */}
      {step === -1 && !result && (
        <section className="rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-sm mb-1">Your name</span>
              <input
                className="border border-slate-400 rounded-lg p-2"
                value={answers.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g., Joan Mitchell"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm mb-1">Where are you based?</span>
              <input
                className="border border-slate-400 rounded-lg p-2"
                value={answers.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="e.g., Bristol, UK"
              />
            </label>
          </div>
          <label className="flex flex-col">
            <span className="text-sm mb-1">Tone</span>
            <select
              className="border border-slate-400 rounded-lg p-2 bg-white"
              value={answers.tone}
              onChange={(e) => setField("tone", e.target.value as Tone)}
            >
              <option value="plain">plain (gallery-friendly)</option>
              <option value="poetic">poetic (gentle, evocative)</option>
              <option value="gallery">gallery (polished, formal)</option>
            </select>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-4 py-2 rounded-xl bg-black text-white">
              Start interview
            </button>
          </div>
        </section>
      )}

      {/* QUESTION FLOW */}
      {step >= 0 && step < QUESTIONS.length && !result && current && (
        <section className="rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <label className="flex flex-col">
            <span className="text-base font-medium mb-1">{current.label}</span>
            {/* Cache key as a strongly-typed const to keep TS/ESLint happy */}
            {(() => {
              const k: QKey = current.key;
              return (
                <textarea
                  id={`statement-${k}`}
                  name={`statement-${k}`}
                  className="border border-slate-400 rounded-lg p-3 min-h-[110px]"
                  placeholder={current.placeholder}
                  value={answers[k]}
                  onChange={(e) => setField(k, e.target.value)}
                />
              );
            })()}
          </label>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="px-4 py-2 rounded-xl border"
            >
              Back
            </button>
            {step < QUESTIONS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-2 rounded-xl bg-black text-white"
              >
                Next
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-black text-white"
              >
                {loading ? "Crafting…" : "Generate statement & bio"}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ERROR */}
      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-100 border border-red-300 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* RESULTS */}
{result && (
  <section className="mt-6 rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-6">
    {/* Statement + Bio */}
    <div className="space-y-4">
      {(["statement", "bio"] as const).map((k) => (
        <div key={k}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold capitalize">{k}</h2>
            <button
              className="text-sm underline"
              onClick={() => copyTextSafe(k, result[k])}
            >
              {copiedKey === k ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-gray-900">{result[k]}</p>
        </div>
      ))}
    </div>

    {/* Divider + Tips */}
    {Array.isArray(result.tips) && result.tips.length > 0 && (
      <div className="border-t border-slate-300 pt-4 mt-4 bg-slate-50 rounded-xl p-4">
        <h3 className="font-medium mb-2">Final touches</h3>
        <p className="text-sm text-gray-700 mb-2">
          Before you submit or post your statement, try these small refinements:
        </p>
        <ul className="list-disc ml-5 space-y-1 text-gray-900">
          {result.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    )}
  </section>
)}


      <footer className="text-xs text-gray-700 mt-6 text-center">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 block mb-2">
          ← Back to home
        </Link>
        Text is processed to generate your statement; nothing is stored.
      </footer>
    </main>
  );
}
