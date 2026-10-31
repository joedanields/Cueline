import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextAreaField } from '../../../components/ui/Field';
import { useStore } from '../../../store';
import { selectNeedGroups } from '../../../store/selectors';
import { TONES, useInviteWriter, type Tone } from '../useInviteWriter';

type PickerProps = {
  group: string;
  tone: Tone;
  onGroup: (group: string) => void;
  onTone: (tone: Tone) => void;
};

function AudiencePicker({ group, tone, onGroup, onTone }: PickerProps) {
  const groups = useStore(selectNeedGroups);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        id="invite-group"
        label="Audience"
        value={group}
        onChange={(e) => onGroup(e.target.value)}
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
        onChange={(e) => onTone(TONES.find((t) => t === e.target.value) ?? 'warm')}
      >
        {TONES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

/** Invite wording per need group. Cueline writes the text; you send it (no SMS/email from the app). */
export function InvitesPanel() {
  const event = useStore((s) => s.event);
  const groups = useStore(selectNeedGroups);
  const [group, setGroup] = useState('everyone');
  const [tone, setTone] = useState<Tone>('warm');
  const invite = useInviteWriter();
  if (!event) return null;
  const label = groups.find((g) => g.key === group)?.label ?? 'Everyone';

  return (
    <section aria-labelledby="invites-heading" className="card space-y-3">
      <h2 id="invites-heading">Invitations</h2>
      <p className="text-muted">
        Tailored to what matters to each group, for {format(new Date(event.startsAt), 'd MMMM')}.
        Cueline never sends messages — copy and send them yourself.
      </p>
      <AudiencePicker group={group} tone={tone} onGroup={setGroup} onTone={setTone} />
      <Button
        variant="primary"
        busy={invite.status === 'loading'}
        busyLabel="Writing…"
        onClick={() => void invite.write(event, group, label, tone)}
      >
        Write invitation
      </Button>
      {invite.status === 'error' ? (
        <p>
          <span aria-hidden="true">ℹ </span>The assistant was unavailable, so a simple template was
          used.
        </p>
      ) : null}
      {invite.text ? (
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
            value={invite.text}
            onChange={(e) => invite.setText(e.target.value)}
          />
          <Button onClick={() => void invite.copy()}>Copy text</Button>
        </>
      ) : null}
    </section>
  );
}
