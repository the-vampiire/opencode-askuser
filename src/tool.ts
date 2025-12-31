import { tool, type ToolContext, type UIHelpers } from "@opencode-ai/plugin"
import {
  AskUserQuestionParamsSchema,
  type AskUserQuestionParams,
  type Question,
  type QuestionResponse,
} from "./types.js"

const TOOL_DESCRIPTION = `Present structured questions to gather user input during planning or clarification.

**Before using this tool**, load the 'ask-questions' skill for guidance on crafting effective, context-aware questions.

Use this when:
- Clarifying ambiguous requirements
- Getting preferences between valid approaches  
- Making decisions with significant downstream impact

Each question has 2-6 options. Users can select one (or multiple if multiSelect) or provide custom input.`

type SessionContext = {
  sessionID: string
  messageID: string
  callID?: string
}

export function createAskUserQuestionTool(ui: UIHelpers) {
  return tool({
    description: TOOL_DESCRIPTION,
    args: AskUserQuestionParamsSchema.shape,

    async execute(args: AskUserQuestionParams, context: ToolContext): Promise<string> {
      const { questions } = args
      const ctx: SessionContext = { sessionID: context.sessionID, messageID: context.messageID }

      const questionsWithIds = questions.map((q: Question, i: number) => ({
        ...q,
        id: q.id ?? `q${i + 1}`,
      }))

      type QuestionWithId = Question & { id: string }

      const fields = questionsWithIds.flatMap((q: QuestionWithId) => {
        const mappedOptions = q.options.map((opt: { label: string; value?: string; description?: string }) => ({
          value: opt.value ?? opt.label,
          label: opt.label,
          description: opt.description,
        }))

        const baseField = q.multiSelect
          ? {
              type: "multiselect" as const,
              id: q.id,
              label: q.header,
              description: q.question,
              options: [
                ...mappedOptions,
                ...(q.allowOther ? [{ value: "__other__", label: "Other (specify)" }] : []),
              ],
            }
          : {
              type: "select" as const,
              id: q.id,
              label: q.header,
              description: q.question,
              options: [
                ...mappedOptions,
                ...(q.allowOther ? [{ value: "__other__", label: "Other (specify)" }] : []),
              ],
            }

        if (q.allowOther) {
          return [
            baseField,
            {
              type: "text" as const,
              id: `${q.id}_other`,
              label: "Specify other",
              condition: { field: q.id, equals: "__other__" },
            },
          ]
        }

        return [baseField]
      })

      const questionCount = questionsWithIds.length
      const formResult = await ui.form(ctx, {
        title: questionCount === 1 ? "Please answer this question" : "Please answer these questions",
        description: "Your responses will help guide the implementation.",
        fields,
        submitLabel: questionCount === 1 ? "Submit Answer" : "Submit Answers",
        cancelLabel: "Skip",
      })

      const responses: QuestionResponse[] = questionsWithIds.map((q: QuestionWithId) => {
        const value = formResult[q.id]
        const selected = Array.isArray(value) ? value : value ? [value] : []
        const hasOther = selected.includes("__other__")
        const otherText = hasOther ? formResult[`${q.id}_other`] : undefined

        return {
          questionId: q.id,
          header: q.header,
          selected: selected.filter((s: string) => s !== "__other__"),
          otherText,
        }
      })

      const output = formatResponses(questionsWithIds, responses)

      return output
    },
  })
}

function formatResponses(
  questions: (Question & { id: string })[],
  responses: QuestionResponse[]
): string {
  const lines: string[] = ["## User Responses", ""]

  for (const response of responses) {
    const question = questions.find((q) => q.id === response.questionId)
    if (!question) continue

    lines.push(`### ${response.header}`)
    lines.push(`**Question**: ${question.question}`)

    if (response.selected.length === 1) {
      lines.push(`**Selected**: ${response.selected[0]}`)
    }
    if (response.selected.length > 1) {
      lines.push(`**Selected**:`)
      for (const sel of response.selected) {
        lines.push(`- ${sel}`)
      }
    }

    if (response.otherText) {
      lines.push(`**Custom Response**: ${response.otherText}`)
    }

    lines.push("")
  }

  return lines.join("\n")
}
