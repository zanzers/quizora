import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "Quizora",
  description: "Upload documents, ask questions, and generate quizzes from your notes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}