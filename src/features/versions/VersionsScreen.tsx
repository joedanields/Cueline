import { useState } from 'react';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { VersionItem } from './VersionItem';

const UNREADABLE = 'That version could not be read, so nothing was changed.';

/** Version history: every significant change is a snapshot; restoring validates it first. */
export default function VersionsScreen() {
  const versions = useStore((s) => s.versions);
  const restoreVersion = useStore((s) => s.restoreVersion);
  const snapshot = useStore((s) => s.snapshot);
  const announce = useAnnounce();
  const [confirming, setConfirming] = useState<string>();
  const [error, setError] = useState<string>();

  const restore = (id: string, reason: string) => {
    snapshot(`Before restoring “${reason}”`.slice(0, 80));
    const ok = restoreVersion(id);
    setConfirming(undefined);
    setError(ok ? undefined : UNREADABLE);
    if (ok)
      announce(`Restored the version “${reason}”. Your previous plan was saved as a version too.`);
    else announce(UNREADABLE, 'assertive');
  };
  const save = () => {
    snapshot('Saved by you');
    announce('Version saved.');
  };

  return (
    <Page
      title="Versions"
      heading="Version history"
      intro="Saved automatically when you confirm event details, import guests, draft tasks or run sheets, and apply a recovery. Up to 20 are kept."
    >
      <section aria-labelledby="save-heading" className="card flex flex-wrap items-center gap-3">
        <h2 id="save-heading" className="sr-only">
          Save a version
        </h2>
        <Button onClick={save}>Save a version now</Button>
      </section>
      {error ? (
        <p role="alert" className="card border-danger">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}
      {versions.length === 0 ? (
        <p className="card">No versions yet.</p>
      ) : (
        <ol className="space-y-2" aria-label="Versions, newest first">
          {versions.map((v) => (
            <VersionItem
              key={v.id}
              version={v}
              confirming={confirming === v.id}
              onAsk={() => setConfirming(v.id)}
              onCancel={() => setConfirming(undefined)}
              onRestore={() => restore(v.id, v.reason)}
            />
          ))}
        </ol>
      )}
    </Page>
  );
}
