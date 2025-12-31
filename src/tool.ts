import type { ToolDefinition, UIHelpers } from "@opencode-ai/plugin"
import {
  AskUserQuestionParamsSchema,
  type AskUserQuestionParams,
  type Question,
  type QuestionResponse,
} from "./types"

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

export function createAskUserQuestionTool(ui: UIHelpers): ToolDefinition {
  return {
    description: TOOL_DESCRIPTION,
    parameters: AskUserQuestionParamsSchema,

    async execute({ parameters, sessionID, messageID, callID }): Promise<{
      title: string
      output: string
      metadata?: Record<string, unknown>
    }> {
      const { questions } = parameters as AskUserQuestionParams
      const ctx: SessionContext = { sessionID, messageID, callID }

      const questionsWithIds = questions.map((q, i) => ({
        ...q,
        id: q.id ?? `q${i + 1}`,
      }))

      const fields = questionsWithIds.flatMap((q) => {
        const baseField = q.multiSelect
          ? {
              type: "multiselect" as const,
              id: q.id,
              label: q.header,
              description: q.question,
              options: q.options.map((opt) => ({
                value: opt.value ?? opt.label,
                label: opt.label,
                description: opt.description,
              })),
            }
          : {
              type: "select" as const,
              id: q.id,
              label: q.header,
              description: q.question,
              options: [
                ...q.options.map((opt) => ({
                  value: opt.value ?? opt.label,
                  label: opt.label,
                  description: opt.description,
                })),
                ...(q.allowOther ? [{ value: "__other__", label: "Other (specify)" }] : []),
              ],
            }

        if (q.allowOther && !q.multiSelect) {
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

      const formResult = await ui.form(ctx, {
        title: "Please answer these questions",
        description: "Your responses will help guide the implementation.",
        fields,
        submitLabel: "Submit Answers",
        cancelLabel: "Skip",
      })

      const responses: QuestionResponse[] = questionsWithIds.map((q) => {
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

      return {
        title: `Asked ${questions.length} question${questions.length > 1 ? "s" : ""}`,
        output,
        metadata: { responses },
      }
    },
  }
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

    if (response.selected.length > 0) {
      if (response.selected.length === 1) {
        lines.push(`**Selected**: ${response.selected[0]}`)
      } else {
        lines.push(`**Selected**:`)
        for (const sel of response.selected) {
          lines.push(`- ${sel}`)
        }
      }
    }

    if (response.otherText) {
      lines.push(`**Custom Response**: ${response.otherText}`)
    }

    lines.push("")
  }

  return lines.join("\n")
}
