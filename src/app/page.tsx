"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800 mb-3">
          Abstract Horizons Tools
        </h1>
        <p className="text-gray-600 text-base sm:text-lg mb-8">
          A growing collection of intuitive tools designed to support expressive
          abstract artists, helping you find words, ideas, and clarity in your creative process.
        </p>

        <Link
          href="/title"
          className="inline-flex items-center justify-center rounded-xl bg-black text-white font-medium px-6 py-3 sm:px-8 sm:py-4 shadow-md hover:shadow-lg hover:bg-gray-800 transition-all duration-200"
        >
          ✨ Open the Art Title Generator
        </Link>

        <div className="mt-10 text-gray-500 text-sm">
          <p>More tools coming soon:</p>
          <ul className="mt-1 space-y-1">
            <li>- Artist Statement & Bio Assistant</li>
            <li>- Abstractifier: Transform your landscape photos into expressive forms</li>
            <li>- Creative Prompt Randomiser</li>
          </ul>
        </div>
      </div>

      <footer className="mt-16 text-xs text-gray-400">
        © {new Date().getFullYear()} Abstract Horizons · Built by Michelle Slee
      </footer>
    </main>
  );
}
