import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-3">AI Knowledge Assistant</h1>
      <p className="text-gray-600 mb-6">
        Upload documents, ask questions, and generate quizzes from your notes.
      </p>

      <div className="flex gap-2">
        <Link
          href="/generate"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Generate quiz
        </Link>
        <Link
          href="/quiz"
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
        >
          Take quiz
        </Link>
        <Link
          href="/score"
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
        >
          View score
        </Link>
      </div>
    </main>
  );
}