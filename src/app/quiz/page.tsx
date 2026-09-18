"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  type: "multiple_choice" | "fill_in_blank";
  question: string;
  options?: { A: string; B: string; C: string; D: string };
  correct: string;
};

type QuizData = {
  questions: Question[];
  sources: string[];
};

export default function QuizPage() {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("quiz");
    if (!stored) {
      router.push("/generate");
      return;
    }
    setQuiz(JSON.parse(stored));
  }, [router]);

  if (!quiz) return null;

  const question = quiz.questions[current];
  const progress = ((current + 1) / quiz.questions.length) * 100;

  function handleNext() {
    if (!quiz) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected("");

    if (current + 1 < quiz.questions.length) {
      setCurrent(current + 1);
    } else {
      sessionStorage.setItem(
        "quizResult",
        JSON.stringify({ questions: quiz.questions, answers: newAnswers, sources: quiz.sources })
      );
      router.push("/score");
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <p className="text-sm text-gray-500 mb-2">
        Question {current + 1} of {quiz.questions.length}
      </p>
      <div className="h-1.5 bg-gray-200 rounded mb-6">
        <div className="h-full bg-blue-600 rounded transition-all" style={{ width: `${progress}%` }} />
      </div>

      <p className="text-base font-medium mb-4">{question.question}</p>

      {question.type === "multiple_choice" ? (
        <div className="flex flex-col gap-2 mb-6">
          {Object.entries(question.options!).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`text-left border rounded px-3 py-2 text-sm ${
                selected === key ? "border-blue-600 bg-blue-50" : "border-gray-300"
              }`}
            >
              {key}. {value}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="border border-gray-300 rounded px-3 py-2 w-full mb-6"
          placeholder="Type your answer"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        />
      )}

      <button
        onClick={handleNext}
        disabled={!selected}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {current + 1 === quiz.questions.length ? "Finish" : "Next"}
      </button>
    </main>
  );
}