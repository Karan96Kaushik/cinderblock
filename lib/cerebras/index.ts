export { CerebrasApiError, CerebrasClient, createCerebrasClient } from './client'
export type {
  CerebrasChatRequest,
  CerebrasChatResponse,
  CerebrasClientOptions,
  CerebrasJsonSchema,
  CerebrasMessage,
  CerebrasRawChatCompletion,
  CerebrasRawErrorBody,
  CerebrasResponseFormat,
  CerebrasRole,
  CerebrasUsage,
} from './types'
export {
  requestStructuredJson,
  StructuredOutputParseError,
} from './structured'
export type { StructuredJsonRequest, StructuredJsonResult } from './structured'
export {
  cerebrasExerciseSchema,
  cerebrasProgramGenerationSchema,
  cerebrasProgressionSchema,
  cerebrasScheduleSchema,
  cerebrasWeekPhaseSchema,
  cerebrasWorkoutSchema,
  toProgramDocumentPatch,
} from './program-schema'
export {
  buildScopeJudgePrompt,
  cerebrasScopeJudgeSchema,
  normalizeScopeJudgeResult,
  requestScopeJudgement,
  SCOPE_JUDGE_CONTEXT,
} from './scope-judge'
export type {
  ScopeJudgePromptInput,
  ScopeJudgeResult,
  ScopeJudgeStage,
  ScopeJudgeVerdict,
} from './scope-judge'
export type {
  CerebrasProgramExercise,
  CerebrasProgramGeneration,
  CerebrasProgramWeekPhase,
  CerebrasProgramWorkout,
} from './program-schema'
