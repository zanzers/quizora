"use client";

import { useState } from "react";

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold mb-4">Generate quiz</h2>

      <input
        className="border border-gray-300 rounded px-3 py-2 w-full mb-3"
        placeholder="Topic, e.g. CAP theorem"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <input
        className="border border-gray-300 rounded px-3 py-2 w-full mb-4"
        type="number"
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate quiz"}
      </button>

      {result && (
        <pre className="mt-6 bg-gray-100 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}