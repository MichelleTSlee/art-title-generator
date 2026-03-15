"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center px-4 pt-16">
      <div className="text-center max-w-xl">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800 mb-3">
          The Abstract Horizons Toolkit
        </h1>
        <p className="text-gray-600 text-base sm:text-lg mb-8">
          A collection of tools to support expressive
          abstract artists find words, ideas and clarity in their creative process.
        </p>
        <p className="text-gray-600 text-sm sm:text-base mb-8 italic">
          Note: This tool uses AI to offer ideas and prompts to support your creative practice. AI can make mistakes. Always use your own judgement. Click the links below
          to access each tool.
        </p>

        <Link
          href="/title"
          className="inline-flex items-center justify-center rounded-xl bg-black text-white font-medium px-6 py-3 sm:px-8 sm:py-4 shadow-md hover:shadow-lg hover:bg-gray-800 transition-all duration-200"
        >
          🎨 The Art Title Generator Tool
        </Link>
        <div className="mt-4">
          <a
            href="/statement"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white font-medium px-6 py-3 shadow hover:bg-gray-800 transition"
          >
            📝 The Artist Statement Tool
          </a>
        </div>

        <div className="mt-4">
        <a
          href="/abstractify"
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white font-medium px-6 py-3 shadow hover:bg-gray-800 transition"
        >
          🧠 The Photo to Abstract Landscape Ideas Tool        </a>
      </div>

        <div className="mt-4">
          <a
            href="/series"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white font-medium px-6 py-3 shadow hover:bg-gray-800 transition"
          >
            ✨ Build a Series from Your Artwork
          </a>
        </div>

        <div className="mt-4">
          <a
            href="/who"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white font-medium px-6 py-3 shadow hover:bg-gray-800 transition"
          >
            🎨 Who Paints Like This?
          </a>
        </div>

        <div className="mt-4">
          <a
            href="/critique"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white font-medium px-6 py-3 shadow hover:bg-gray-800 transition"
          >
            💬 Art Critique Tool
          </a>
        </div>

      </div>
    </main>
  );
}
