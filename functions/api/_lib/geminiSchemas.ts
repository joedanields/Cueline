import { AgeBand, Dietary, GuestRole, Mobility, Sensory, TagConfidence, Travel } from '../../../src/shared/schemas/guest';
import { PriorityKey } from '../../../src/shared/schemas/event';
import { TaskCategory } from '../../../src/shared/schemas/task';
import { ConstraintKind } from '../../../src/shared/schemas/runsheet';
import { INPUT_TYPES, INTAKE_FIELDS, type AiTaskName } from './schemas';

/** Gemini `responseSchema` (OpenAPI subset). zod re-validates everything server- and client-side. */
export type GeminiSchema = {
  type: 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  enum?: string[];
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
};

const str = (values?: readonly string[]): GeminiSchema => (values ? { type: 'STRING', enum: [...values] } : { type: 'STRING' });
const int: GeminiSchema = { type: 'INTEGER' };
const bool: GeminiSchema = { type: 'BOOLEAN' };
const arr = (items: GeminiSchema): GeminiSchema => ({ type: 'ARRAY', items });
const obj = (properties: Record<string, GeminiSchema>, optional: string[] = []): GeminiSchema => ({
  type: 'OBJECT',
  properties,
  required: Object.keys(properties).filter((k) => !optional.includes(k)),
});

const conf = str(TagConfidence.options);
const assumptions = arr(str());
// The four recovery ops share one flat shape; the op name decides which fields apply.
const recoveryOp = obj(
  { op: str(['shorten', 'drop', 'swap', 'moveBefore']), segmentId: str(), byMin: int, a: str(), b: str(), beforeId: str() },
  ['segmentId', 'byMin', 'a', 'b', 'beforeId'],
);

export const GEMINI_SCHEMAS: Record<AiTaskName, GeminiSchema> = {
  intakeNext: obj(
    { done: bool, field: str(INTAKE_FIELDS), question: str(), inputType: str(INPUT_TYPES), options: arr(str()), why: str() },
    ['field', 'question', 'inputType', 'options', 'why'],
  ),
  guestLens: obj({
    guests: arr(obj({
      id: str(), ageBand: str(AgeBand.options), dietary: arr(str(Dietary.options)), mobility: str(Mobility.options),
      sensory: str(Sensory.options), travel: str(Travel.options), role: str(GuestRole.options), note: str(),
      confidence: obj({ ageBand: conf, dietary: conf, mobility: conf, sensory: conf, travel: conf, role: conf }),
    }, ['note'])),
    assumptions,
  }),
  checklist: obj({ items: arr(obj({ trigger: str(), text: str() })) }),
  prepTasks: obj({
    tasks: arr(obj({
      key: str(), title: str(), category: str(TaskCategory.options.flatMap((o) => o.options)), durationDays: int,
      latestStartDaysBefore: int, dependsOn: arr(str()), ownerRole: str(['organizer', 'helper', 'vendor']), needTrigger: str(),
    }, ['needTrigger'])),
    assumptions,
  }),
  helperBrief: obj({ brief: str() }),
  vendorQuestions: obj({ questions: arr(obj({ text: str(), why: str() })) }),
  runSheet: obj({
    segments: arr(obj({
      key: str(), title: str(), offsetMin: int, durationMin: int, minDurationMin: int, ownerLabel: str(), cue: str(),
      priority: str(PriorityKey.options), optional: bool,
    })),
    constraints: arr(obj({
      kind: str(ConstraintKind.options), segmentKey: str(), minutesFromStart: int, otherSegmentKey: str(), reason: str(),
      needGroup: str(), severity: str(['hard', 'soft']),
    }, ['minutesFromStart', 'otherSegmentKey'])),
    assumptions,
  }),
  recovery: obj({ options: arr(obj({ label: str(), rationale: str(), ops: arr(recoveryOp) })) }),
  invites: obj({ text: str() }),
};

