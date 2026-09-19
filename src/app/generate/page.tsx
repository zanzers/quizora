"use client";

import { useState } from "react";
import Link from "next/link";

type Question = {
  type: "multiple_choice" | "fill_in_blank";
  question: string;
  options?: { A: string; B: string; C: string; D: string };
  correct: string;
};

export default function GeneratePage() {
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [title, setTitle] = useState("");

  // Step 1 — upload
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [filename, setFilename] = useState("");

  // Step 2 — count + generation
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Step 4 — save
  const [saving, setSaving] = useState(false);
  const [quizInfo, setQuizInfo] = useState<{ code: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return;
    }

    setDocumentId(data.documentId);
    setFilename(data.filename);
  }

  async function handleGeneratePreview() {
    setGenerating(true);
    setError("");

    const res = await fetch("/api/generate-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, filename, count }),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    setQuestions(data.questions);
    setTitle(filename.replace(/\.(md|pdf|txt)$/i, ""));
    setStep("review");
  }

  async function handleSaveQuiz() {
    if(!title.trim()){
      setError("Please enter a title");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/save-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        topic: filename,
        questions,
        sources: [filename],
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    setQuizInfo(data);
    setStep("done");
  }

  function copyCode() {
    if (!quizInfo) return;
    navigator.clipboard.writeText(quizInfo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <h2 className="text-xl font-semibold mb-4">Generate quiz</h2>

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

      {step === "upload" && (
        <>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg px-4 py-8 mb-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
            <span className="text-sm text-gray-600">
              {file ? file.name : "Click to choose a file (.md, .pdf, .txt)"}
            </span>
            <input
              type="file"
              accept=".md,.pdf,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              
              className="hidden"
            />
          </label>

          

          {!documentId ? (
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          ) : (
            <>
              <p className="text-sm text-green-600 mb-4">
                Uploaded: {filename}
              </p>

              <label className="block text-sm text-gray-600 mb-1">Number of questions</label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 w-full mb-4"
              />

              <button
                onClick={handleGeneratePreview}
                disabled={generating}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Continue"}
              </button>
            </>
          )}
        </>
      )}

      {step === "review" && (
        <>
          <label className="block text-sm text-gray-600 mb-1">Quiz title</label>
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Title" 
            className="border border-gray-300 px-3 py-2 w-full mb-4"
          />
          
          <p className="text-sm text-gray-500 mb-4">
            Review {questions.length} questions from {filename}
          </p>

          <div className="flex flex-col gap-4 mb-6 max-h-96 overflow-y-auto">
            {questions.map((q, i) => (
              <div key={i} className="border border-gray-200 rounded p-3 text-sm">
                <p className="font-medium mb-2">{i + 1}. {q.question}</p>
                {q.type === "multiple_choice" ? (
                  <ul className="text-gray-600">
                    {Object.entries(q.options!).map(([key, value]) => (
                      <li key={key} className={key === q.correct ? "text-green-600" : ""}>
                        {key}. {value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">Answer: {q.correct}</p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Generating code..." : "Generate Code"}
          </button>
        </>
      )}

      {step === "done" && quizInfo && (
  <div className="border border-gray-200 rounded-lg p-6 text-center">
    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
      ✓
    </div>

    <p className="text-lg font-semibold mb-1">{quizInfo.title}</p>
    <p className="text-sm text-gray-500 mb-4">Your quiz is ready to share</p>

    <div className="flex items-center justify-center gap-2 mb-6">
      <code className="bg-gray-100 px-4 py-2 rounded text-sm font-mono">{quizInfo.code}</code>
      <button
        onClick={copyCode}
        className="text-sm text-blue-600 hover:underline whitespace-nowrap"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>

    <Link
      href={`/quiz?code=${quizInfo.code}`}
      className="block bg-blue-600 text-white px-4 py-2.5 rounded hover:bg-blue-700 mb-3"
    >
      Start quiz now
    </Link>


      <p className="text-sm mb-2 mt-2"> Download quiz (PDF) instead </p>

    <div className="flex gap-2">
      
       <a href={`/api/export/${quizInfo.code}?answers=false`}
        className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 text-sm"
      >
        Worksheet 
      </a>
      
       <a href={`/api/export/${quizInfo.code}?answers=true`}
        className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 text-sm"
      >
        Answer key
      </a>
    </div>
  </div>
)}
    </main>
  );
}