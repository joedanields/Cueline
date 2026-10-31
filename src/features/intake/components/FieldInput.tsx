import { ChoiceGroup, SelectField, TextField } from '../../../components/ui/Field';
import { WeightSliders } from '../../../components/ui/WeightSliders';
import { MealType, VenueType } from '../../../shared/schemas';
import type { IntakeField } from '../../../shared/aiTasks';
import { CURRENCIES, type DraftErrors, type IntakeDraft } from '../intakeLogic';

const VENUE_OPTIONS = VenueType.options.map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}));
const MEAL_OPTIONS = MealType.options.map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}));
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

/** The right control for an intake field. Enum fields always use fixed options, never AI-provided ones. */
export function FieldInput({
  field,
  label,
  draft,
  onChange,
  options,
  errors = {},
  idPrefix,
}: Props) {
  const id = `${idPrefix}-${field}`;
  switch (field) {
    case 'startsAt':
    case 'endsAt':
      return (
        <TextField
          id={id}
          label={label}
          type="datetime-local"
          value={draft[field]}
          error={errors[field]}
          onChange={(e) => onChange({ [field]: e.target.value })}
        />
      );
    case 'venueType':
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
    case 'mealTypes':
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
    case 'weights':
      return (
        <WeightSliders
          idPrefix={id}
          value={draft.weights}
          onChange={(weights) => onChange({ weights })}
        />
      );
    case 'budget':
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
    case 'guestCountRough':
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
    case 'weatherBackup': {
      const opts = (options?.length ? options : WEATHER_DEFAULTS).map((o) => ({
        value: o,
        label: o,
      }));
      return (
        <ChoiceGroup
          name={id}
          legend={label}
          options={opts}
          value={draft.weatherBackup ? [draft.weatherBackup] : []}
          onChange={([v]) => onChange({ weatherBackup: v ?? '' })}
        />
      );
    }
    case 'kidsAgeRange':
      if (options?.length) {
        return (
          <ChoiceGroup
            name={id}
            legend={label}
            options={options.map((o) => ({ value: o, label: o }))}
            value={draft.kidsAgeRange ? [draft.kidsAgeRange] : []}
            onChange={([v]) => onChange({ kidsAgeRange: v ?? '' })}
          />
        );
      }
      return (
        <TextField
          id={id}
          label={label}
          maxLength={80}
          value={draft.kidsAgeRange}
          onChange={(e) => onChange({ kidsAgeRange: e.target.value })}
        />
      );
    case 'occasion':
    case 'region':
    case 'culturalContext': {
      const max = field === 'culturalContext' ? 200 : 80;
      return (
        <TextField
          id={id}
          label={label}
          maxLength={max}
          value={draft[field]}
          error={errors[field]}
          onChange={(e) => onChange({ [field]: e.target.value })}
        />
      );
    }
  }
}
