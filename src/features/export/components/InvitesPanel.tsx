import { useState } from 'react';
import { format } from 'date-fns';
import { useAi } from '../../../ai/useAi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextAreaField } from '../../../components/ui/Field';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import { useStore } from '../../../store';
import { selectNeedGroups } from '../../../store/selectors';
import { fallbackInvite, fillPlaceholders, groupSpecifics } from '../inviteLogic';

const TONES = ['warm', 'formal', 'playful'] as const;
type Tone = (typeof TONES)[number];

/** Invite wording per need group. Cueline writes the text; you send it (no SMS/email from the app). */
export function InvitesPanel() {
  const event = useStore((s) => s.event);
  const groups = useStore(selectNeedGroups);
  const announce = useAnnounce();
  const [group, setGroup] = useState('everyone');
  const [tone, setTone] = useState<Tone>('warm');
  const [text, setText] = useState('');
  const ai = useAi('invites', {
    loading: 'Writing the invitation…',
    success: () => 'Invitation drafted. Edit it freely, then copy.',
  });
  if (!event) return null;
  const label = groups.find((g) => g.key === group)?.label ?? 'Everyone';

  const write = async () => {
    const specifics = groupSpecifics(group, event.venueType);
    const out = await ai.run({
      group: label,
      tone,
      groupSpecifics: specifics,
      eventFacts: {
        occasion: event.occasion,
        title: event.title,
        date: '{date}',
        time: '{time}',
        venueType: event.venueType,
      },
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

  return (
    <section aria-labelledby="invites-heading" className="card space-y-3">
      <h2 id="invites-heading">Invitations</h2>
      <p className="text-muted">
        Tailored to what matters to each group, for {format(new Date(event.startsAt), 'd MMMM')}.
        Cueline never sends messages — copy and send them yourself.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="invite-group"
          label="Audience"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="everyone">Everyone</option>
          {groups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label} ({g.count})
            </option>
          ))}
        </SelectField>
        <SelectField
          id="invite-tone"
          label="Tone"
          value={tone}
          onChange={(e) => setTone(TONES.find((t) => t === e.target.value) ?? 'warm')}
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      </div>
      <Button
        variant="primary"
        busy={ai.status === 'loading'}
        busyLabel="Writing…"
        onClick={() => void write()}
      >
        Write invitation
      </Button>
      {ai.status === 'error' ? (
        <p>
          <span aria-hidden="true">ℹ </span>The assistant was unavailable, so a simple template was
          used.
        </p>
      ) : null}
      {text ? (
        <>
          <TextAreaField
            id="invite-text"
            label={
              <>
                Invitation for {label}{' '}
                <Badge tone="accent" icon="✎">
                  Draft — edit freely
                </Badge>
              </>
            }
            rows={6}
            maxLength={700}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button onClick={() => void copy()}>Copy text</Button>
        </>
      ) : null}
    </section>
  );
}
