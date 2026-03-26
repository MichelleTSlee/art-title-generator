import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Privacy Notice</h1>
      <p className="mt-4 text-gray-700 leading-relaxed">
        We respect your privacy. This website only uses the information you provide to generate responses for the tools you choose to use.
      </p>

      <section className="mt-6 space-y-3 text-gray-700 leading-relaxed">
        <p>
          We do not intentionally collect sensitive personal data. Please avoid uploading confidential or personal information in text or images.
        </p>
        <p>
          Tool inputs may be processed by third-party AI providers to return results. We use reasonable measures to protect data in transit and to limit access.
        </p>
        <p>
          You can contact us if you have questions about how your data is handled, corrected, or removed where applicable.
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
