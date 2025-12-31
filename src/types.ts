import { tool } from "@opencode-ai/plugin"

// Use the same zod instance as the plugin (zod 4.x)
const z = tool.schema

export const QuestionOptionSchema = z.object({
  label: z.string().describe("Display label for the option"),
  value: z.string().optional().describe("Value to return (defaults to label)"),
  description: z.string().optional().describe("Additional context for the option"),
})

export const QuestionSchema = z.object({
  id: z.string().optional().describe("Unique identifier (auto-generated if not provided)"),
  question: z.string().describe("The question to ask the user"),
  header: z.string().max(12).describe("Short label for the question (max 12 chars)"),
  options: z
    .array(QuestionOptionSchema)
    .min(2)
    .max(6)
    .describe("2-6 predefined answer options"),
  multiSelect: z.boolean().default(false).describe("Allow selecting multiple options"),
  allowOther: z.boolean().default(true).describe("Allow custom text response"),
})

export const AskUserQuestionParamsSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(6).describe("1-6 questions to ask the user"),
})

export type QuestionOption = {
  label: string
  value?: string
  description?: string
}

export type Question = {
  id?: string
  question: string
  header: string
  options: QuestionOption[]
  multiSelect: boolean
  allowOther: boolean
}

export type AskUserQuestionParams = {
  questions: Question[]
}

export type QuestionResponse = {
  questionId: string
  header: string
  selected: string[]
  otherText?: string
}

export type AskUserQuestionResult = {
  responses: QuestionResponse[]
  formatted: string
}
