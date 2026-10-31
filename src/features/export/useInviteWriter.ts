import { useState } from 'react';
import { useAi } from '../../ai/useAi';
import { useAnnounce } from '../../components/ui/LiveRegion';
import type { CelebrationEvent } from '../../shared/schemas';
import { fallbackInvite, fillPlaceholders, groupSpecifics } from './inviteLogic';

export const TONES = ['warm', 'formal', 'playful'] as const;
export type Tone = (typeof TONES)[number];

/**
 * Draft an invitation for one need group. Dates and times go to the AI as `{date}`/`{time}`
 * placeholders and are filled in here; a plain template is used if the AI is unavailable.
 */
export function useInviteWriter() {
  const announce = useAnnounce();
  const [text, setText] = useState('');
  const ai = useAi('invites', {
    loading: 'Writing the invitation…',
    success: () => 'Invitation drafted. Edit it freely, then copy.',
  });

  const write = async (event: CelebrationEvent, group: string, label: string, tone: Tone) => {
    const specifics = groupSpecifics(group, event.venueType);
    const { occasion, title, venueType } = event;
    const out = await ai.run({
      group: label,
      tone,
      groupSpecifics: specifics,
      eventFacts: { occasion, title, date: '{date}', time: '{time}', venueType },
    });
    setText(fillPlaceholders(out?.text ?? fallbackInvite(event, specifics), event));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      announce('Invitation copied.');
    } catch {
      announce('Copy failed — select the text and copy it manually.', 'assertive');
    }
  };

  return { text, setText, write, copy, status: ai.status };
}
