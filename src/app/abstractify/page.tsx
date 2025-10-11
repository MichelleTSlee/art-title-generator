"use client";
import React, { useRef, useState, useCallback } from "react";

type Path = {
  level: 1 | 2 | 3 | 4 | 5;
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

type Result = {
  brief_read: string;
  paths: Path[];
  closing_line: string;
  error?: string;
  debug?: string;
};

export default function AbstractifyPage() {
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);


  const onSelectFile = useCallback((file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPEG/PNG).");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Image too large (max ~6MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setError("");
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectFile(e.target.files?.[0] || null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    onSelectFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  async function handleGenerate() {
    if (!imageDataUrl) {
      setError("Add a landscape image first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch("/api/abstractify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, notes }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Request failed");
      setResult(data as Result);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const copy = (t: string) => navigator.clipboard.writeText(t);

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6 bg-white text-gray-900">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">The Photo to Abstract Landscape Ideas Tool</h1>
        <p className="text-sm text-gray-700 mt-2">
          Upload a photo of a landscape, and the tool will suggest five different ways to approach it as an abstract painting.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-4">
        {/* Image */}
        <div>
          {imageDataUrl ? (
            <div>
              <img
                src={imageDataUrl}
                alt="preview"
                className="w-full rounded-xl border border-slate-300 object-contain max-h-[50vh] bg-white"
              />
              <div className="flex gap-3 mt-2">
                <button
                  className="text-sm underline"
                  onClick={() => {
                    setImageDataUrl("");
                    setResult(null);
                  }}
                >
                  Remove image
                </button>
                <button className="text-sm underline" onClick={() => fileRef.current?.click()}>
                  Change image
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-3 rounded-xl bg-black text-white font-medium shadow hover:shadow-md transition"
                onClick={() => fileRef.current?.click()}
              >
                Select landscape photo
              </button>
              <div
                className="mt-3 text-xs text-gray-700 border border-dashed rounded-xl p-4"
                onDrop={onDrop}
                onDragOver={onDragOver}
              >
                Or drop an image here (JPEG/PNG, under ~6MB)
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileInputChange} />
        </div>

        {/* Notes */}
        <label className="flex flex-col">
          <span className="text-sm mb-1">Optional notes (intent, palette loves, constraints)</span>
          <textarea
            className="border border-slate-400 rounded-lg p-2 min-h-[90px]"
            placeholder="e.g., keep a sense of horizon; love cool greys + raw umber; prefer knife/roller; avoid literal trees."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading || !imageDataUrl /* or your condition */}
        className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
      >
        {loading ? "Thinking…" : "Generate"}
      </button>

      {result && !loading && (
        <span className="text-sm text-gray-700">Results below <span aria-hidden>↓</span></span>
      )}
    </div>
      </section>

      {/* RESULTS */}
     
      {result && (
     
      <div ref={resultsRef}>
        <section className="mt-6 rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Brief read</h2>
            <p className="text-gray-900 mt-1 whitespace-pre-wrap">{result.brief_read}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {result.paths?.map((p, i) => (
              <div key={i} className="border border-slate-300 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-semibold">
                    {i + 1}. {p.label}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded border bg-slate-100 text-gray-900">
                    Level {p.level} 
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    <strong>What to do:</strong> {p.what_to_do}
                  </p>
                  <p className="text-gray-900 whitespace-pre-wrap mt-1">
                    <strong>Why it’s interesting:</strong> {p.why_interesting}
                  </p>
                </div>
                {p.prompts && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.prompts.surface && (
                      <div className="text-sm bg-slate-100 border border-slate-300 rounded px-2 py-1">
                        <strong>Surface:</strong> {p.prompts.surface}
                      </div>
                    )}
                    {p.prompts.materials && (
                      <div className="text-sm bg-slate-100 border border-slate-300 rounded px-2 py-1">
                        <strong>Materials:</strong> {p.prompts.materials}
                      </div>
                    )}
                    {p.prompts.try && (
                      <div className="text-sm bg-slate-100 border border-slate-300 rounded px-2 py-1">
                        <strong>Try:</strong> {p.prompts.try}
                      </div>
                    )}
                    {p.prompts.palette_cue && (
                      <div className="text-sm bg-slate-100 border border-slate-300 rounded px-2 py-1">
                        <strong>Palette cue:</strong> {p.prompts.palette_cue}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <button
                    className="text-sm underline"
                    onClick={() =>
                      copy(
                        `Level ${p.level} — ${p.label}\n\nWhat to do:\n${p.what_to_do}\n\nWhy it’s interesting:\n${p.why_interesting}`
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2">
            <p className="text-gray-900 font-medium">{result.closing_line}</p>
          </div>

          
        </section>
      </div>
      )}

      <footer className="text-xs text-gray-700 mt-6">
        Images are processed to generate suggestions; nothing is stored.
      </footer>
    </main>
  );
}
