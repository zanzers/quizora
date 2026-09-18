import PDFDocument from "pdfkit";

type Question = {
  type: "multiple_choice" | "fill_in_blank";
  question: string;
  options?: { A: string; B: string; C: string; D: string };
  correct: string;
};

export function buildQuizPdf(
  title: string,
  questions: Question[],
  includeAnswers: boolean
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown(1.5);

    questions.forEach((q, i) => {
      doc.fontSize(12).text(`${i + 1}. ${q.question}`, { continued: false });
      doc.moveDown(0.3);

      if (q.type === "multiple_choice") {
        Object.entries(q.options!).forEach(([key, value]) => {
          const marker = includeAnswers && key === q.correct ? " ✓" : "";
          doc.fontSize(11).text(`   ${key}. ${value}${marker}`);
        });
      } else {
        doc.fontSize(11).text("   ________________________________");
        if (includeAnswers) {
          doc.fontSize(11).fillColor("green").text(`   Answer: ${q.correct}`);
          doc.fillColor("black");
        }
      }

      doc.moveDown(1);
    });

    doc.end();
  });
}