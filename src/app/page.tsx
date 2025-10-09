// src/app/page.tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Studio Tools</h1>
      <p className="mb-6 text-gray-600">
        Welcome! Head to the Art Title Generator to get started.
      </p>
      <a
        href="/title"
        className="inline-block px-4 py-2 rounded-lg bg-black text-white"
      >
        Open Art Title Generator
      </a>
    </main>
  );
}
