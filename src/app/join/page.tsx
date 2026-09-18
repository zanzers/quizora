"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [quiz, setQuiz] = useState<{ code: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLookup() {
    setLoading(true);
    setError("");
    setQuiz(null);

    const res = await fetch(`/api/quiz/${code.trim()}`);
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Quiz not found.");
      return;
    }

    setQuiz(data);
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold mb-4">Join a quiz</h2>

      <input
        className="border border-gray-300 rounded px-3 py-2 w-full mb-3"
        placeholder="Enter code, e.g. k3f9-x8q-p4mz"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        onClick={handleLookup}
        disabled={loading || !code}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Looking up..." : "Find quiz"}
      </button>

      {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}

      {quiz && (
        <div className="mt-6 border border-gray-200 rounded p-4">
          <p className="text-sm text-gray-500 mb-1">Found:</p>
          <p className="font-medium mb-4">{quiz.title}</p>
          <button
            onClick={() => router.push(`/quiz?code=${quiz.code}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Start this quiz
          </button>
        </div>
      )}
    </main>
  );
}