import type { ReactElement } from 'react';
import { ChoiceGroup, SelectField, TextField } from '../../../components/ui/Field';
import { WeightSliders } from '../../../components/ui/WeightSliders';
import { MealType, VenueType } from '../../../shared/schemas';
import type { IntakeField } from '../../../shared/aiTasks';
import { CURRENCIES, type DraftErrors, type IntakeDraft } from '../intakeLogic';

const capitalised = (v: string) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) });
const plain = (v: string) => ({ value: v, label: v });
const VENUE_OPTIONS = VenueType.options.map(capitalised);
const MEAL_OPTIONS = MealType.options.map(capitalised);
const WEATHER_DEFAULTS = ['Yes, indoor backup', 'Tents or cover', 'No backup yet'];

type Props = {
  field: IntakeField;
  label: string;
  draft: IntakeDraft;
  onChange: (patch: Partial<IntakeDraft>) => void;
  options?: string[];
  errors?: DraftErrors;
  idPrefix: string;
};
type InputProps = Required<Omit<Props, 'options' | 'idPrefix'>> & {
  id: string;
  options?: string[];
};
type TextKey = 'occasion' | 'region' | 'culturalContext' | 'startsAt' | 'endsAt';

const TEXT_MAX: Partial<Record<TextKey, number>> = {
  occasion: 80,
  region: 80,
  culturalContext: 200,
};

function TextInput({ id, field, label, draft, errors, onChange }: InputProps) {
  const key = field as TextKey;
  const isDate = key === 'startsAt' || key === 'endsAt';
  return (
    <TextField
      id={id}
      label={label}
      type={isDate ? 'datetime-local' : undefined}
      maxLength={TEXT_MAX[key]}
      value={draft[key]}
      error={errors[key]}
      onChange={(e) => onChange({ [key]: e.target.value })}
    />
  );
}

function VenueInput({ id, label, draft, errors, onChange }: InputProps) {
  return (
    <ChoiceGroup
      name={id}
      legend={label}
      options={VENUE_OPTIONS}
      value={draft.venueType ? [draft.venueType] : []}
      error={errors.venueType}
      onChange={([v]) => onChange({ venueType: VenueType.parse(v) })}
    />
  );
}

function MealsInput({ id, label, draft, errors, onChange }: InputProps) {
  return (
    <ChoiceGroup
      name={id}
      legend={label}
      multiple
      options={MEAL_OPTIONS}
      value={draft.mealTypes}
      error={errors.mealTypes}
      onChange={(v) => onChange({ mealTypes: v.map((m) => MealType.parse(m)) })}
    />
  );
}

function BudgetInput({ id, label, draft, errors, onChange }: InputProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
      <TextField
        id={id}
        label={label}
        inputMode="decimal"
        autoComplete="off"
        value={draft.budgetMajor}
        error={errors.budgetMajor}
        hint="Total, in whole currency units."
        onChange={(e) => onChange({ budgetMajor: e.target.value })}
      />
      <SelectField
        id={`${id}-currency`}
        label="Currency"
        value={draft.currency}
        onChange={(e) => onChange({ currency: e.target.value })}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

function GuestCountInput({ id, label, draft, onChange }: InputProps) {
  return (
    <TextField
      id={id}
      label={label}
      type="number"
      min={1}
      max={1000}
      inputMode="numeric"
      value={draft.guestCountRough}
      onChange={(e) => onChange({ guestCountRough: e.target.value })}
    />
  );
}

/** Single choice from the given options; for free-text fields the AI may suggest the options. */
function choiceOf(key: 'weatherBackup' | 'kidsAgeRange', defaults: string[] = []) {
  return function Choice({ id, label, draft, options, onChange }: InputProps) {
    const opts = options?.length ? options : defaults;
    if (opts.length === 0) {
      return (
        <TextField
          id={id}
          label={label}
          maxLength={80}
          value={draft[key]}
          onChange={(e) => onChange({ [key]: e.target.value })}
        />
      );
    }
    return (
      <ChoiceGroup
        name={id}
        legend={label}
        options={opts.map(plain)}
        value={draft[key] ? [draft[key]] : []}
        onChange={([v]) => onChange({ [key]: v ?? '' })}
      />
    );
  };
}

const RENDERERS: Record<IntakeField, (p: InputProps) => ReactElement> = {
  occasion: TextInput,
  region: TextInput,
  culturalContext: TextInput,
  startsAt: TextInput,
  endsAt: TextInput,
  venueType: VenueInput,
  mealTypes: MealsInput,
  budget: BudgetInput,
  guestCountRough: GuestCountInput,
  weatherBackup: choiceOf('weatherBackup', WEATHER_DEFAULTS),
  kidsAgeRange: choiceOf('kidsAgeRange'),
  weights: ({ id, draft, onChange }) => (
    <WeightSliders
      idPrefix={id}
      value={draft.weights}
      onChange={(weights) => onChange({ weights })}
    />
  ),
};

/** The right control for an intake field. Enum fields always use fixed options, never AI-provided ones. */
export function FieldInput({ idPrefix, errors = {}, ...rest }: Props) {
  const Render = RENDERERS[rest.field];
  return <Render {...rest} errors={errors} id={`${idPrefix}-${rest.field}`} />;
}
