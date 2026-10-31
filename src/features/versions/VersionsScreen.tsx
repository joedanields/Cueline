import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';

/** Version history: every significant change is a snapshot; restoring validates it first. */
export default function VersionsScreen() {
  const versions = useStore((s) => s.versions);
  const restoreVersion = useStore((s) => s.restoreVersion);
  const snapshot = useStore((s) => s.snapshot);
  const announce = useAnnounce();
  const [confirming, setConfirming] = useState<string>();
  const [error, setError] = useState<string>();
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const restore = (id: string, reason: string) => {
    snapshot(`Before restoring “${reason}”`.slice(0, 80));
    const ok = restoreVersion(id);
    setConfirming(undefined);
    if (ok) {
      setError(undefined);
      announce(`Restored the version “${reason}”. Your previous plan was saved as a version too.`);
    } else {
      setError('That version could not be read, so nothing was changed.');
      announce('That version could not be read, so nothing was changed.', 'assertive');
    }
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
        <Button
          onClick={() => {
            snapshot('Saved by you');
            announce('Version saved.');
          }}
        >
          Save a version now
        </Button>
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
            <li key={v.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{v.reason}</p>
                <p className="text-sm text-muted">
                  <time dateTime={v.at}>{format(new Date(v.at), 'd MMM yyyy, HH:mm')}</time>
                </p>
              </div>
              {confirming === v.id ? (
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label={`Confirm restoring ${v.reason}`}
                >
                  <span>Replace your current plan with this version?</span>
                  <Button
                    ref={confirmRef}
                    variant="primary"
                    onClick={() => restore(v.id, v.reason)}
                  >
                    Yes, restore
                  </Button>
                  <Button onClick={() => setConfirming(undefined)}>Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => setConfirming(v.id)}>
                  Restore<span className="sr-only"> “{v.reason}”</span>
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}
