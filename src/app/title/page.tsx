"use client";
import React, { useRef, useState, useCallback } from "react";

const TONES = ["poetic", "cinematic", "minimal", "lyrical", "mysterious"] as const;
type Tone = typeof TONES[number];

type TitleResult = {
  tone: string;
  titles: string[];
  top_rationales: { title: string; why_it_fits: string }[];
  tags: string[];
  // if API returns an error/debug payload, we’ll just show it in <details>
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
      setError("Please upload an artwork image first.");
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
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-2">Art Title Generator</h1>
      <p className="text-sm text-gray-600 mb-6">
        Upload your artwork, pick a tone, add optional keywords, and get 12 title options with 3 short rationales.
      </p>

      {/* Upload area */}
      <div className="mb-4">
        {imageDataUrl ? (
          <div>
            <img
              src={imageDataUrl}
              alt="preview"
              className="w-full rounded-xl shadow mb-2"
            />
            <div className="flex gap-3">
              <button
                className="text-sm underline"
                onClick={() => {
                  setImageDataUrl("");
                  setResult(null);
                }}
              >
                Remove image
              </button>
              <button
                className="text-sm underline"
                onClick={() => fileRef.current?.click()}
              >
                Replace image
              </button>
            </div>
          </div>
        ) : (
          <div
            className="border border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            role="button"
          >
            <p className="mb-2">Drop an image here or click to upload</p>
            <p className="text-xs text-gray-500">JPEG/PNG, under ~6MB recommended</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileInputChange}
        />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label className="flex flex-col">
          <span className="text-sm mb-1">Tone</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="border rounded p-2"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-sm mb-1">Keywords (optional)</span>
          <input
            className="border rounded p-2"
            placeholder="e.g., mist, winter dusk, tidal flats, memory"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
      >
        {loading ? "Thinking…" : "Generate Titles"}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Results</h2>
          <p className="text-sm text-gray-600 mb-3">
            Tone: {result.tone || <em>(not returned)</em>}
          </p>

          <div className="space-y-2">
            {Array.isArray(result.titles) && result.titles.length > 0 ? (
              result.titles.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border rounded-lg p-2"
                >
                  <span className="pr-3">{t}</span>
                  <button className="text-sm underline" onClick={() => copyText(t)}>
                    Copy
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-600">No titles returned.</div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-2">Top picks & why</h3>
            {Array.isArray(result.top_rationales) && result.top_rationales.length > 0 ? (
              <ul className="list-disc ml-5 space-y-2">
                {result.top_rationales.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.title}</span> —{" "}
                    <span className="text-gray-700">{r.why_it_fits}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">No rationales returned.</p>
            )}
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-2">Tags</h3>
            {Array.isArray(result.tags) && result.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 text-sm bg-gray-100 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No tags returned.</p>
            )}
          </div>

          
        </section>
      )}
    </main>
  );
}
