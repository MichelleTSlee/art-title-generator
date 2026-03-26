import Link from "next/link";

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Cookies</h1>
      <p className="mt-4 text-gray-700 leading-relaxed">
        This website may use essential cookies or similar technologies to help the site function and improve reliability.
      </p>

      <section className="mt-6 space-y-3 text-gray-700 leading-relaxed">
        <p>
          We do not use cookies to build detailed advertising profiles. Any analytics, where enabled, are used to understand general usage patterns.
        </p>
        <p>
          You can control cookies through your browser settings, including blocking or deleting them. Some site features may not work correctly if cookies are disabled.
        </p>
        <p>
          Continued use of the website indicates acceptance of this cookies notice.
        </p>
      </section>

      <p className="mt-8">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 hover:underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </main>
  );
}
