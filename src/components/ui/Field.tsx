import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export const inputClass =
  'mt-1 block w-full min-h-[44px] rounded border-2 border-line bg-bg px-3 py-2 text-fg aria-[invalid=true]:border-danger';

type FieldShellProps = { id: string; label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode };

/** Label + hint + error, linked to the control via `aria-describedby`. */
export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria props shared by every control inside a FieldShell. */
export function describedBy(id: string, hint?: ReactNode, error?: string) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return { 'aria-describedby': ids || undefined, 'aria-invalid': error ? true : undefined };
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode; hint?: ReactNode; error?: string };

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ id, label, hint, error, className = '', ...rest }, ref) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input ref={ref} id={id} className={`${inputClass} ${className}`} {...describedBy(id, hint, error)} {...rest} />
    </FieldShell>
  );
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: ReactNode; hint?: ReactNode; error?: string };

export function TextAreaField({ id, label, hint, error, className = '', ...rest }: TextAreaProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea id={id} className={`${inputClass} ${className}`} {...describedBy(id, hint, error)} {...rest} />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode };

export function SelectField({ id, label, hint, error, children, className = '', ...rest }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} className={`${inputClass} ${className}`} {...describedBy(id, hint, error)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

type ChoiceGroupProps = {
  name: string;
  legend: ReactNode;
  options: { value: string; label: string }[];
  multiple?: boolean;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
};

/** Native radio/checkbox group in a fieldset — arrow keys work for radios out of the box. */
export function ChoiceGroup({ name, legend, options, multiple = false, value, onChange, error }: ChoiceGroupProps) {
  const errorId = `${name}-error`;
  return (
    <fieldset className="space-y-2" aria-describedby={error ? errorId : undefined}>
      <legend className="font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label key={o.value} className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 ${checked ? 'border-accent' : 'border-line'}`}>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={o.value}
                checked={checked}
                onChange={(e) => {
                  if (!multiple) onChange([o.value]);
                  else onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value));
                }}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
