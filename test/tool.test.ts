import { describe, expect, test, mock } from "bun:test"
import { createAskUserQuestionTool } from "../src/tool"

describe("askuserquestion tool", () => {
  test("creates tool with correct description", () => {
    const mockUI = {
      form: mock(() => Promise.resolve({})),
      confirm: mock(() => Promise.resolve(true)),
      select: mock(() => Promise.resolve("")),
      multiselect: mock(() => Promise.resolve([])),
      toast: mock(() => Promise.resolve()),
    }
    const tool = createAskUserQuestionTool(mockUI)

    expect(tool.description).toContain("structured questions")
    expect(tool.description).toContain("ask-questions")
  })

  test("converts questions to form fields", async () => {
    let capturedFields: any = null
    const mockUI = {
      form: mock((ctx: any, input: any) => {
        capturedFields = input.fields
        return Promise.resolve({ q1: "PostgreSQL" })
      }),
      confirm: mock(() => Promise.resolve(true)),
      select: mock(() => Promise.resolve("")),
      multiselect: mock(() => Promise.resolve([])),
      toast: mock(() => Promise.resolve()),
    }

    const tool = createAskUserQuestionTool(mockUI)

    await tool.execute({
      parameters: {
        questions: [
          {
            question: "Which database?",
            header: "Database",
            options: [
              { label: "PostgreSQL", description: "Relational" },
              { label: "MongoDB", description: "Document" },
            ],
          },
        ],
      },
      sessionID: "test",
      messageID: "test",
      callID: "test",
      agent: "build",
    })

    expect(capturedFields.length).toBeGreaterThanOrEqual(1)
    expect(capturedFields[0].type).toBe("select")
    expect(capturedFields[0].label).toBe("Database")
  })

  test("handles multiselect questions", async () => {
    let capturedFields: any = null
    const mockUI = {
      form: mock((ctx: any, input: any) => {
        capturedFields = input.fields
        return Promise.resolve({ q1: ["Auth", "API"] })
      }),
      confirm: mock(() => Promise.resolve(true)),
      select: mock(() => Promise.resolve("")),
      multiselect: mock(() => Promise.resolve([])),
      toast: mock(() => Promise.resolve()),
    }

    const tool = createAskUserQuestionTool(mockUI)

    await tool.execute({
      parameters: {
        questions: [
          {
            question: "Which features?",
            header: "Features",
            options: [{ label: "Auth" }, { label: "API" }, { label: "Dashboard" }],
            multiSelect: true,
          },
        ],
      },
      sessionID: "test",
      messageID: "test",
      callID: "test",
      agent: "build",
    })

    expect(capturedFields[0].type).toBe("multiselect")
  })

  test("formats responses as markdown", async () => {
    const mockUI = {
      form: mock(() =>
        Promise.resolve({
          q1: "PostgreSQL",
        })
      ),
      confirm: mock(() => Promise.resolve(true)),
      select: mock(() => Promise.resolve("")),
      multiselect: mock(() => Promise.resolve([])),
      toast: mock(() => Promise.resolve()),
    }

    const tool = createAskUserQuestionTool(mockUI)

    const result = await tool.execute({
      parameters: {
        questions: [
          {
            id: "q1",
            question: "Database choice?",
            header: "Database",
            options: [{ label: "PostgreSQL" }, { label: "MongoDB" }],
          },
        ],
      },
      sessionID: "test",
      messageID: "test",
      callID: "test",
      agent: "build",
    })

    expect(result.output).toContain("## User Responses")
    expect(result.output).toContain("### Database")
    expect(result.output).toContain("PostgreSQL")
  })

  test("respects allowOther: false", async () => {
    let capturedFields: any = null
    const mockUI = {
      form: mock((ctx: any, input: any) => {
        capturedFields = input.fields
        return Promise.resolve({ q1: "Option1" })
      }),
      confirm: mock(() => Promise.resolve(true)),
      select: mock(() => Promise.resolve("")),
      multiselect: mock(() => Promise.resolve([])),
      toast: mock(() => Promise.resolve()),
    }

    const tool = createAskUserQuestionTool(mockUI)

    await tool.execute({
      parameters: {
        questions: [
          {
            question: "Choose one",
            header: "Choice",
            options: [{ label: "Option1" }, { label: "Option2" }],
            allowOther: false,
          },
        ],
      },
      sessionID: "test",
      messageID: "test",
      callID: "test",
      agent: "build",
    })

    expect(capturedFields[0].options).toHaveLength(2)
    expect(capturedFields).toHaveLength(1)
  })
})
