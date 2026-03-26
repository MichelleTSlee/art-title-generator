import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

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
            <nav aria-label="Legal links" className="mt-3">
              <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-gray-900 underline-offset-2 hover:underline">
                    Privacy
                  </Link>
                </li>
                <li aria-hidden="true">|</li>
                <li>
                  <Link href="/terms" className="hover:text-gray-900 underline-offset-2 hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li aria-hidden="true">|</li>
                <li>
                  <Link href="/cookies" className="hover:text-gray-900 underline-offset-2 hover:underline">
                    Cookies
                  </Link>
                </li>
              </ul>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
