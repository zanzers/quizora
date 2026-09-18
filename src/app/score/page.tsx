"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  type: "multiple_choice" | "fill_in_blank";
  question: string;
  correct: string;
};

type QuizResult = {
  questions: Question[];
  answers: string[];
  sources: string[];
};

export default function ScorePage() {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [correctFlags, setCorrectFlags] = useState<boolean[] | null>(null);
  const [grading, setGrading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("quizResult");
    if (!stored) {
      router.push("/generate");
      return;
    }
    setResult(JSON.parse(stored));
  }, [router]);


  useEffect(() => {
      if (!result) return;

      async function gradeAll(){
        const flags: boolean[] = new Array(result!.questions.length).fill(false);

        const fillBlankItems: {index: number; question: string; correctAnswer: string; studentAnswer: string }[] = [];

        result!.questions.forEach((q,i) => {
            if(q.type === "multiple_choice"){
                flags[i] = q.correct.trim().toLowerCase() === result!.answers[i].trim().toLowerCase();
            }else{
                fillBlankItems.push({
                    index: i,
                    question: q.question,
                    correctAnswer: q.correct,
                    studentAnswer: result!.answers[i],
                });
            }
        });

        if(fillBlankItems.length > 0){
            const res = await fetch("/api/grade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: fillBlankItems }),
            });
            const { results } = await res.json();
            fillBlankItems.forEach((item, j) => {
                flags[item.index] = results[j]?.correct ?? false;
            });
        }

        setCorrectFlags(flags);
        setGrading(false);
     
      }
      gradeAll();
  }, [result]);

  if(!result){
     return null;
    } else if(grading){
         return (
      <main className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Grading your answers...</p>
      </main>
    );
    }
  


  const correctCount = correctFlags!.filter(Boolean).length;
  const missed = result.questions.map((q, i) => ({q, i})).filter(({i}) => !correctFlags![i]);

  return (
    <main className="max-w-xl mx-auto px-4 py-12 text-center">
      <p className="text-sm text-gray-500 mb-1">Quiz complete</p>
      <p className="text-4xl font-semibold mb-1">
        {correctCount} / {result.questions.length}
      </p>
      <p className="text-sm text-green-600 mb-6">
        {Math.round((correctCount / result.questions.length) * 100)}% correct
      </p>

      {missed.length > 0 && (
        <div className="text-left mb-6">
          <p className="text-sm font-medium mb-2">Missed questions</p>
          {missed.map(({ q, i }) => (
            <div key={i} className="border-t border-gray-200 py-2 text-sm">
              <p className="text-red-600">✕ {q.question}</p>
              <p className="text-gray-500">Correct: {q.correct}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mb-6">Sources: {result.sources.join(", ")}</p>

      <a href="/generate" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block">
        Retake with a new topic
      </a>
    </main>
  );
}