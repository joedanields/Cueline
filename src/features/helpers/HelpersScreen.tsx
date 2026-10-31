import { Page } from '../../components/ui/Page';
import { useStore } from '../../store';
import { HelperPanel } from './components/HelperPanel';
import { AddHelperForm } from './components/AddHelperForm';

export default function HelpersScreen() {
  const helpers = useStore((s) => s.helpers);

  return (
    <Page
      title="Helpers"
      heading="Helper roster"
      intro="Volunteers get a short brief and a cue card with only their own jobs. Cueline never claims anyone is available — only what you enter."
    >
      <AddHelperForm />
      {helpers.length === 0 ? (
        <p className="card">No helpers yet. Add the friends and family who are pitching in.</p>
      ) : null}
      {helpers.map((h, i) => (
        <HelperPanel key={h.id} helper={h} index={i} />
      ))}
    </Page>
  );
}
