/* eslint-disable @typescript-eslint/no-empty-function */
import * as TE from "fp-ts/TaskEither"

import { TestResult } from "~/types"
import { getPreRequestScriptMethods } from "~/utils"

const executeScriptInContext = (
  preRequestScript: string,
  envs: TestResult["envs"]
): TE.TaskEither<string, TestResult["envs"]> => {
  const { pw, updatedEnvs } = getPreRequestScriptMethods(envs)

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

  // Create a function from the pre request script using the `Function` constructor
  const asyncExecuteScript = new AsyncFunction("pw", preRequestScript)

  const execute = TE.tryCatchK(
    async () => {
      await asyncExecuteScript(pw)
      return updatedEnvs
    },
    (error) => `Script execution failed: ${(error as Error).message}`
  )

  // Execute the script
  const result = execute()

  return result
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { preRequestScript, envs } = event.data

  const results = await executeScriptInContext(preRequestScript, envs)()

  // Post the result back to the main thread
  self.postMessage({ results })
})
