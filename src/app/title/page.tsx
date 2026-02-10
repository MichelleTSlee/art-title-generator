"use client";
import React, { useRef, useState, useCallback } from "react";
import Link from "next/link";

const TONES = ["poetic", "cinematic", "minimal", "lyrical", "mysterious"] as const;
type Tone = typeof TONES[number];

type TitleResult = {
  tone: string;
  titles: string[];
  top_rationales: { title: string; why_it_fits: string }[];
  tags: string[];
  error?: string;
  debug?: string;
};

export default function TitleToolPage() {
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [tone, setTone] = useState<Tone>("poetic");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TitleResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onSelectFile = useCallback((file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPEG/PNG).");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Image is too large. Please keep it under ~6MB.");
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

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  async function handleGenerate() {
    if (!imageDataUrl) {
      setError("Add an artwork image first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, tone, keywords }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Request failed");
      setResult(data as TitleResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const copyText = (text: string) => navigator.clipboard.writeText(text);

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6 bg-white text-gray-900">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Art Title Generator</h1>
        <p className="text-sm text-gray-700 mt-2">
          Upload your artwork, pick a tone, add optional keywords, and get 12 title options with 3 short rationales.
        </p>
      </header>

      {/* Card */}
      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6">
        {/* SELECT IMAGE BUTTON */}
        <div className="mb-4">
          {imageDataUrl ? (
            <div>
              <img
                src={imageDataUrl}
                alt="preview"
                className="w-full rounded-xl border border-slate-300 aspect-auto object-contain max-h-[50vh] bg-white"
              />
              <div className="flex gap-3 mt-2">
                <button
                  className="text-sm underline text-gray-900"
                  onClick={() => {
                    setImageDataUrl("");
                    setResult(null);
                  }}
                >
                  Remove image
                </button>
                <button
                  className="text-sm underline text-gray-900"
                  onClick={() => fileRef.current?.click()}
                >
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
                Select artwork image
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
          <input
            ref={fileRef}
            id="title-artwork-image"
            name="title-artwork-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileInputChange}
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label className="flex flex-col">
            <span className="text-sm mb-1 text-gray-900">Tone</span>
            <select
              id="title-tone"
              name="title-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="border border-slate-400 rounded-lg p-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            >
              {TONES.map((t) => (
                <option key={t} value={t} className="text-gray-900 bg-white">
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-sm mb-1 text-gray-900">Keywords (optional)</span>
            <input
              id="title-keywords"
              name="title-keywords"
              className="border border-slate-400 rounded-lg p-2 bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g., mist, winter dusk, tidal flats, memory"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !imageDataUrl}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Generate Titles"}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-100 border border-red-300 p-3 rounded-lg">
            {error}
          </div>
        )}
      </section>

      {/* RESULTS */}
      {result && (
        <section className="mt-6 rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold">Results</h2>
            <p className="text-sm text-gray-800">Tone: {result.tone || <em>(not returned)</em>}</p>
          </div>

          {/* Titles */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.isArray(result.titles) && result.titles.length > 0 ? (
              result.titles.map((t, i) => (
                <div key={i} className="flex items-center justify-between border border-slate-300 rounded-lg p-2 bg-white">
                  <span className="pr-3 break-words whitespace-normal max-w-full text-gray-900">{t}</span>
                  <button className="text-sm underline text-gray-900" onClick={() => copyText(t)}>
                    Copy
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-800">No titles returned.</div>
            )}
          </div>

          {/* Rationales */}
          <div className="mt-6">
            <h3 className="font-medium mb-2 text-gray-900">Top picks & why</h3>
            {Array.isArray(result.top_rationales) && result.top_rationales.length > 0 ? (
              <ul className="list-disc ml-5 space-y-2 text-gray-900">
                {result.top_rationales.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium break-words">{r.title}</span> —{" "}
                    <span className="text-gray-800 break-words">{r.why_it_fits}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-800">No rationales returned.</p>
            )}
          </div>

          {/* Tags – boosted contrast + wrap */}
          <div className="mt-6">
            <h3 className="font-medium mb-2 text-gray-900">Tags</h3>
            {Array.isArray(result.tags) && result.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-w-full">
                {result.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-sm bg-slate-100 text-gray-900 rounded-lg border border-slate-300 break-words whitespace-normal"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-800">No tags returned.</p>
            )}
          </div>

         
        </section>
      )}

      <footer className="text-xs text-gray-700 mt-6 text-center">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 block mb-2">
          ← Back to home
        </Link>
        Images are processed to generate titles; nothing is stored.
      </footer>
    </main>
  );
}
