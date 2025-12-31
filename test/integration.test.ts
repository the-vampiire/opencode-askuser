import { describe, expect, test } from "bun:test"
import { AskUserPlugin } from "../src/plugin"

describe("askuser plugin integration", () => {
  test("returns empty hooks when UI not available", async () => {
    const input = {
      client: {} as any,
      project: {} as any,
      directory: "/test",
      worktree: "/test",
      serverUrl: new URL("http://localhost:4096"),
      $: {} as any,
    }

    const hooks = await AskUserPlugin(input)

    expect(hooks.tool).toBeUndefined()
  })

  test("registers tool when UI is available", async () => {
    const input = {
      client: {} as any,
      project: {} as any,
      directory: "/test",
      worktree: "/test",
      serverUrl: new URL("http://localhost:4096"),
      $: {} as any,
      ui: {
        form: async () => ({}),
        confirm: async () => true,
        select: async () => "",
        multiselect: async () => [],
        toast: async () => {},
      },
    }

    const hooks = await AskUserPlugin(input)

    expect(hooks.tool).toBeDefined()
    expect(hooks.tool?.askuserquestion).toBeDefined()
  })
})
