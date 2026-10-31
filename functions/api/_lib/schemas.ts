// Shared contracts live in src/shared so the browser validates responses with the same schemas.
export {
  AiRequestSchema,
  AiSchemas,
  AI_TASKS,
  AiTaskName,
  INTAKE_FIELDS,
  INPUT_TYPES,
} from '../../../src/shared/aiTasks';
export type { AiErrorCode, AiInput, AiOutput } from '../../../src/shared/aiTasks';
