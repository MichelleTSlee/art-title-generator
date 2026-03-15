import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abstract Horizons Tools",
  description: "Artist-made AI tools to support expressive abstract practice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-white text-gray-900">
      <head>
        {/* Prevent browsers from auto-darkening inputs on dark screens */}
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-gray-200 bg-white/95 px-4 py-5 text-center text-sm text-gray-600">
            <p>
              <span className="font-semibold">AI Notice</span>
            </p>
            <p className="mt-1 max-w-3xl mx-auto">
              This tool uses AI to generate creative suggestions. AI can make mistakes. Always use your own judgement.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
