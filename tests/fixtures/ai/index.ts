import type { AiInput, AiTaskName } from '../../../src/shared/aiTasks';
import intakeNext from './intakeNext.json';
import intakeNextInvalid from './intakeNext.invalid.json';
import guestLens from './guestLens.json';
import guestLensInvalid from './guestLens.invalid.json';
import checklist from './checklist.json';
import checklistInvalid from './checklist.invalid.json';
import prepTasks from './prepTasks.json';
import prepTasksInvalid from './prepTasks.invalid.json';
import helperBrief from './helperBrief.json';
import helperBriefInvalid from './helperBrief.invalid.json';
import vendorQuestions from './vendorQuestions.json';
import vendorQuestionsInvalid from './vendorQuestions.invalid.json';
import runSheet from './runSheet.json';
import runSheetInvalid from './runSheet.invalid.json';
import recovery from './recovery.json';
import recoveryInvalid from './recovery.invalid.json';
import invites from './invites.json';
import invitesInvalid from './invites.invalid.json';

/** Valid Gemini outputs per task. */
export const AI_OUTPUTS: Record<AiTaskName, unknown> = {
  intakeNext, guestLens, checklist, prepTasks, helperBrief, vendorQuestions, runSheet, recovery, invites,
};

/** Outputs that must fail the task's output schema. */
export const AI_INVALID_OUTPUTS: Record<AiTaskName, unknown> = {
  intakeNext: intakeNextInvalid, guestLens: guestLensInvalid, checklist: checklistInvalid, prepTasks: prepTasksInvalid,
  helperBrief: helperBriefInvalid, vendorQuestions: vendorQuestionsInvalid, runSheet: runSheetInvalid,
  recovery: recoveryInvalid, invites: invitesInvalid,
};

const weights = { food: 4, comfort: 5, decor: 2, entertainment: 3, photos: 3 };

/** Valid inputs per task. */
export const AI_INPUTS: { [K in AiTaskName]: AiInput<K> } = {
  intakeNext: { answers: { occasion: 'Birthday', venueType: 'Outdoor' }, asked: ['occasion', 'venueType'] },
  guestLens: { lines: [{ id: 'g_001', text: 'grandpa, birthday boy, diabetic, uses walker' }, { id: 'g_002', text: 'family (4) — 2 kids under 6, veg' }], occasion: 'Birthday' },
  checklist: { triggers: ['mobility:wheelchair', 'venue:outdoor'], venueType: 'outdoor', outdoor: true },
  prepTasks: { occasion: 'Birthday', venueType: 'outdoor', daysUntilEvent: 21, needSummary: { 'age:senior': 11 }, mealTypes: ['lunch'], helpersCount: 4, hasVendors: ['caterer'] },
  helperBrief: { helperLabel: 'Helper A', assignments: { tasks: ['Set up ramp'], segments: [{ time: '12:00', title: 'Welcome', cue: 'Guide guests' }] }, eventFacts: { occasion: 'Birthday', venueType: 'outdoor', startsAt: '2030-06-01T12:00:00Z' } },
  vendorQuestions: { vendorType: 'caterer', needSummary: { 'diet:diabetic_friendly': 3 }, venueType: 'outdoor', occasion: 'Birthday' },
  runSheet: { occasion: 'Birthday', durationMin: 240, mealTypes: ['lunch'], needSummary: { 'age:senior': 11 }, helpers: [{ label: 'Helper A' }], weights },
  recovery: {
    segments: [{ id: 's_lunch', title: 'Lunch', status: 'upcoming', offsetMin: 90, durationMin: 60, minDurationMin: 45, priority: 'food', optional: false, locked: false }],
    breaks: [{ constraintId: 'c_1', reason: 'Seniors eat by 13:20', byMin: 10 }], weights, nowOffsetMin: 40,
  },
  invites: { group: 'Seniors', eventFacts: { occasion: 'Birthday', title: 'Grandpa’s 75th', date: '1 June', time: '12:00', venueType: 'outdoor' }, groupSpecifics: ['Step-free entrance at side gate'], tone: 'warm' },
};

/** Wrap an output object the way Gemini returns structured JSON. */
export function geminiBody(output: unknown): string {
  return JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] });
}
