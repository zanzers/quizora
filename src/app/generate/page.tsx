"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    setError("");


    const result = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count }),
    });
    const data = await result.json();
    setLoading(false);

    if(!result.ok){
      setError(data.error || "Something went wrong.");
      return;
    }

    sessionStorage.setItem("quiz", JSON.stringify(data));
    router.push("/quiz");
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
        disabled={loading || !topic}
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