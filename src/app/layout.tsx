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
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
