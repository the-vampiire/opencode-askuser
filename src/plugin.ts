import type { Plugin, PluginInput } from "@opencode-ai/plugin"
import { createAskUserQuestionTool } from "./tool"

export const AskUserPlugin: Plugin = async (input: PluginInput) => {
  const { ui } = input

  if (!ui?.form) {
    console.warn(
      "[opencode-askuser] UI Intent not available. " +
        "This plugin requires opencode with UI Intent support. " +
        "See: https://github.com/sst/opencode/issues/6330"
    )
    return {}
  }

  return {
    tool: {
      askuserquestion: createAskUserQuestionTool(ui),
    },
  }
}

export default AskUserPlugin
