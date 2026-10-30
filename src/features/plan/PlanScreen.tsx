import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { Tabs } from '../../components/ui/Tabs';
import { useStore } from '../../store';
import { QuantitiesTab } from './components/QuantitiesTab';
import { MenuTab } from './components/MenuTab';
import { SeatingTab } from './components/SeatingTab';
import { ChecklistTab } from './components/ChecklistTab';
import { BudgetTab } from './components/BudgetTab';

const TABS = [
  { id: 'quantities', label: 'Quantities', render: () => <QuantitiesTab /> },
  { id: 'menu', label: 'Menu coverage', render: () => <MenuTab /> },
  { id: 'seating', label: 'Seating', render: () => <SeatingTab /> },
  { id: 'checklist', label: 'Accessibility', render: () => <ChecklistTab /> },
  { id: 'budget', label: 'Budget', render: () => <BudgetTab /> },
];

export default function PlanScreen() {
  const hasEvent = useStore((s) => Boolean(s.event));
  return (
    <Page title="Plan" heading="Needs → Plan" intro="Everything here recalculates instantly from your guests, RSVPs and priorities — no AI involved in the numbers.">
      {hasEvent ? null : (
        <p className="card">
          <span aria-hidden="true">ℹ </span>Start with your <Link to="/intake" className="underline">event details</Link> to unlock quantities and budget.
        </p>
      )}
      <Tabs label="Plan sections" tabs={TABS} />
    </Page>
  );
}
