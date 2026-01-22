"use client";
import React, { useRef, useState, useCallback } from "react";
import Link from "next/link";

type ArtistMatch = {
  name: string;
  visual_connection: string;
  suggestion: string;
};

type WhoResult = {
  artists: ArtistMatch[];
  error?: string;
  debug?: string;
};

/** ---------- Image helpers: resize + convert to JPEG ---------- */
async function resizeAndConvertToJpeg(
  file: File,
  opts: { maxEdge: number; quality: number; maxBytes: number }
): Promise<string> {
  const { maxEdge, quality, maxBytes } = opts;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Failed to read image"));
    fr.readAsDataURL(file);
  });

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);

    const { width, height } = scaleToFit(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");

    ctx.drawImage(bitmap, 0, 0, width, height);

    let currentQuality = quality;
    let outDataUrl = canvas.toDataURL("image/jpeg", currentQuality);

    while (outDataUrl.length > maxBytes && currentQuality > 0.4) {
      currentQuality -= 0.05;
      outDataUrl = canvas.toDataURL("image/jpeg", currentQuality);
    }

    return outDataUrl;
  } catch {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = scaleToFit(img.width, img.height, maxEdge);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unsupported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let currentQuality = quality;
        let outDataUrl = canvas.toDataURL("image/jpeg", currentQuality);

        while (outDataUrl.length > maxBytes && currentQuality > 0.4) {
          currentQuality -= 0.05;
          outDataUrl = canvas.toDataURL("image/jpeg", currentQuality);
        }

        resolve(outDataUrl);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
  }
}

function scaleToFit(w: number, h: number, maxEdge: number) {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  const scale = Math.min(maxEdge / w, maxEdge / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export default function WhoPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const resized = await resizeAndConvertToJpeg(file, {
        maxEdge: 1200,
        quality: 0.88,
        maxBytes: 4_000_000,
      });
      setImageDataUrl(resized);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error processing image");
    } finally {
      setLoading(false);
    }
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleGenerate = useCallback(async () => {
    if ((!imageDataUrl && !description.trim()) || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/who", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageDataUrl: imageDataUrl || undefined,
          description: description.trim() || undefined 
        }),
      });

      const data = (await res.json()) as WhoResult;

      if (!res.ok || data.error) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error finding artist matches");
    } finally {
      setLoading(false);
    }
  }, [imageDataUrl, description, loading]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 bg-white text-gray-900 min-h-screen">
      <header className="mb-6 sm:mb-8">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 mb-3 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          🎨 Who Paints Like This?
        </h1>
        <p className="text-sm text-gray-700 mt-2">
          Upload your artwork or describe it to discover artists whose work shares visual and material similarities.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-4">
        {/* IMAGE UPLOAD */}
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
                  Remove
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
                📷 Upload your artwork
              </button>
              <div
                className="mt-3 text-xs text-gray-700 border border-dashed rounded-xl p-4"
                onDrop={onDrop}
                onDragOver={onDragOver}
              >
                or drag and drop an image here
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileInputChange} />
        </div>

        {/* OPTIONAL DESCRIPTION */}
        <div className="text-center text-sm text-gray-600">or</div>

        <label className="flex flex-col">
          <span className="text-sm mb-1">Describe your painting</span>
          <textarea
            className="border border-slate-400 rounded-lg p-2 min-h-[90px]"
            placeholder="e.g., thick impasto layers, scraped back in places, muted blues and greys, gestural marks with palette knife..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {/* GENERATE BUTTON */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading || (!imageDataUrl && !description.trim())}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50 font-medium"
          >
            {loading ? "Finding matches..." : "Find Similar Artists"}
          </button>

          {result && (
            <span className="text-sm text-gray-700">
              Results below <span aria-hidden>↓</span>
            </span>
          )}
        </div>
      </section>

      {/* RESULTS */}
      {result && (
        <div ref={resultsRef}>
          <section className="mt-6 rounded-2xl border border-slate-300 bg-white shadow-sm p-4 sm:p-6 space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold">Artists with visual similarities:</h2>
            
            <div className="space-y-5">
              {result.artists.map((artist, idx) => (
                <div key={idx} className="pl-4 border-l-2 border-gray-300">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{artist.name}</h3>
                  <p className="text-gray-800 leading-relaxed mb-2">{artist.visual_connection}</p>
                  <p className="text-sm text-gray-700 italic">{artist.suggestion}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <footer className="mt-8 text-center">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to home
        </Link>
      </footer>
    </main>
  );
}
