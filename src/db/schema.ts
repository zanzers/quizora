import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";


export const quizzes = pgTable("quizzes", {
    code: text("code").primaryKey(),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    questions: jsonb("questions").notNull(),
    sources: jsonb("sources").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});