import { describe, expect, it } from 'vitest';
import { draftsToTasks, groupByWeek } from './taskDrafts';
import { topoOrder, scheduleTasks } from '../../engine/schedule';
import { activeQuote, lineForVendor, mergeQuestions, sourceForQuote } from '../vendors/vendorLogic';
import { assignmentsFor, buildHelperCard, helperLabel, restoreHelperName } from '../helpers/helperLogic';
import { decodeHelperCard, encodeHelperCard, MAX_FRAGMENT_CHARS } from '../../lib/urlState';
import { buildDemoState } from '../../data/demo';
import type { Vendor } from '../../shared/schemas';

const draft = (key: string, dependsOn: string[] = [], extra = {}) => ({
  key, title: key, category: 'venue' as const, durationDays: 1, latestStartDaysBefore: 10, dependsOn, ownerRole: 'helper' as const, ...extra,
});

describe('task drafts', () => {
  it('maps keys to ids, drops unknown/self deps and duplicate keys', () => {
    const tasks = draftsToTasks([draft('a', ['b', 'zzz', 'a']), draft('b'), draft('a'), draft('c', [], { ownerRole: 'organizer', needTrigger: 'mobility:wheelchair' })]);
    expect(tasks.map((t) => t.id)).toEqual(['t_a', 't_b', 't_c']);
    expect(tasks[0]?.dependsOn).toEqual(['t_b']);
    expect(tasks[2]).toMatchObject({ ownerId: 'organizer', needTrigger: 'mobility:wheelchair', status: 'todo' });
  });

  it('breaks dependency cycles so the result always schedules', () => {
    const tasks = draftsToTasks([draft('a', ['c']), draft('b', ['a']), draft('c', ['b'])]);
    expect('order' in topoOrder(tasks)).toBe(true);
  });

  it('groups scheduled tasks by week relative to the event', () => {
    const r = scheduleTasks(draftsToTasks([draft('a'), draft('b', [], { latestStartDaysBefore: 1 })]), '2030-06-01T12:00:00', new Date('2030-05-01T09:00:00'));
    const weeks = r.ok ? groupByWeek(r.tasks, '2030-06-01T12:00:00') : [];
    expect(weeks).toHaveLength(2);
    expect(weeks[0]?.label).toBe('Week of 20 May · 1 week before');
    expect(weeks[1]?.label).toMatch(/event week/);
  });
});

describe('vendor logic', () => {
  const v = (quotes: Vendor['quotes']): Vendor => ({ id: 'v_1', type: 'baker', name: 'Bakery', questions: [], quotes });
  const q = (amount: number, status: Vendor['quotes'][number]['status']) => ({ amount: { amount, currency: 'INR' }, inclusions: '', status });

  it('flips the linked budget line to quote, then confirmed when accepted', () => {
    expect(lineForVendor(v([q(500, 'received')]), [])).toMatchObject({ category: 'food', source: 'quote', amount: { amount: 500 }, vendorId: 'v_1' });
    const lines = [{ id: 'b_cake', category: 'food' as const, label: 'Cake', amount: { amount: 1, currency: 'INR' }, source: 'estimate' as const, perGuest: false, vendorId: 'v_1' }];
    expect(lineForVendor(v([q(500, 'received'), q(450, 'accepted')]), lines)).toMatchObject({ id: 'b_cake', source: 'confirmed', amount: { amount: 450 } });
    expect(lineForVendor(v([q(500, 'rejected')]), [])).toBeUndefined();
    expect(sourceForQuote({ status: 'negotiating' })).toBe('quote');
    expect(activeQuote(v([q(1, 'received'), q(2, 'negotiating')]))?.amount.amount).toBe(2);
  });

  it('merges suggested questions without duplicates', () => {
    expect(mergeQuestions([{ text: 'Step-free?', answer: 'yes' }], ['step-free?', 'Sugar-free?', 'Sugar-free?'])).toEqual([{ text: 'Step-free?', answer: 'yes' }, { text: 'Sugar-free?' }]);
  });
});

describe('helpers and share links', () => {
  const demo = buildDemoState(new Date('2030-01-01T09:00:00Z'));
  const event = demo.event;
  if (!event) throw new Error('demo event');

  it('collects a helper’s tasks and timed cues', () => {
    const a = assignmentsFor('h_priya', demo.tasks, demo.runSheet, event.startsAt);
    expect(a.tasks.map((t) => t.title)).toContain('Collect photos for the memory slideshow');
    expect(a.segments.map((s) => s.title)).toEqual(['Cake cutting and song', 'Family group photos']);
    expect(a.segments[0]?.time).toMatch(/^\d{2}:\d{2}$/);
    expect(assignmentsFor('h_x', [], undefined, undefined)).toEqual({ tasks: [], segments: [] });
  });

  it('uses pseudonymous labels and restores the name locally', () => {
    expect(helperLabel(0)).toBe('Helper A');
    expect(restoreHelperName('Helper A: arrive early. Helper A owns cake.', 'Helper A', 'Priya')).toBe('Priya: arrive early. Priya owns cake.');
  });

  it('round-trips a card through the URL fragment and rejects tampering', () => {
    const card = buildHelperCard({ id: 'h_priya', name: 'Priya', brief: 'Bring the cake — नमस्ते' }, event, assignmentsFor('h_priya', demo.tasks, demo.runSheet, event.startsAt));
    const encoded = encodeHelperCard(card);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeHelperCard(`#${encoded}`)).toEqual(card);
    expect(JSON.stringify(card)).not.toMatch(/Mohan|Sharma/);
    expect(decodeHelperCard('#not-base64!!')).toBeUndefined();
    expect(decodeHelperCard(`#${btoa(JSON.stringify({ v: 2, name: 'x' }))}`)).toBeUndefined();
    expect(decodeHelperCard('#' + 'a'.repeat(MAX_FRAGMENT_CHARS + 1))).toBeUndefined();
    expect(decodeHelperCard('')).toBeUndefined();
  });
});
