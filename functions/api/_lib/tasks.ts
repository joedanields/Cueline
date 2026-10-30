import type { z } from 'zod';
import { AiSchemas, type AiTaskName } from './schemas';
import { GEMINI_SCHEMAS, type GeminiSchema } from './geminiSchemas';
import { buildPrompt, type Prompt } from './prompts';

export type TaskDefinition = {
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  responseSchema: GeminiSchema;
  buildPrompt: (input: never) => Prompt;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const RECOVERY_TIMEOUT_MS = 8_000; // live mode: a fast deterministic fallback beats a slow answer

type Tuning = { maxOutputTokens: number; temperature: number; timeoutMs?: number };

// Lower temperature for extraction/structure, a little higher for wording.
const TUNING: Record<AiTaskName, Tuning> = {
  intakeNext: { maxOutputTokens: 512, temperature: 0.3 },
  guestLens: { maxOutputTokens: 8192, temperature: 0.1 },
  checklist: { maxOutputTokens: 2048, temperature: 0.3 },
  prepTasks: { maxOutputTokens: 4096, temperature: 0.3 },
  helperBrief: { maxOutputTokens: 512, temperature: 0.6 },
  vendorQuestions: { maxOutputTokens: 1536, temperature: 0.4 },
  runSheet: { maxOutputTokens: 4096, temperature: 0.3 },
  recovery: { maxOutputTokens: 1536, temperature: 0.2, timeoutMs: RECOVERY_TIMEOUT_MS },
  invites: { maxOutputTokens: 768, temperature: 0.7 },
};

function define(name: AiTaskName): TaskDefinition {
  return {
    inputSchema: AiSchemas[name].input,
    outputSchema: AiSchemas[name].output,
    responseSchema: GEMINI_SCHEMAS[name],
    buildPrompt: (input: never) => buildPrompt(name, input),
    maxOutputTokens: TUNING[name].maxOutputTokens,
    temperature: TUNING[name].temperature,
    timeoutMs: TUNING[name].timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

/** Task registry: the ONLY prompts the proxy will ever send. Unknown task names are rejected. */
export const TASKS: Record<AiTaskName, TaskDefinition> = {
  intakeNext: define('intakeNext'),
  guestLens: define('guestLens'),
  checklist: define('checklist'),
  prepTasks: define('prepTasks'),
  helperBrief: define('helperBrief'),
  vendorQuestions: define('vendorQuestions'),
  runSheet: define('runSheet'),
  recovery: define('recovery'),
  invites: define('invites'),
};
