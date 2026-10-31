import { useState } from 'react';
import { useStore } from '../../../store';
import { needLabel } from '../../../engine/needs';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextField } from '../../../components/ui/Field';
import { Dietary, DishSchema, type Dish } from '../../../shared/schemas';
import { newId } from '../../../lib/id';

const COURSES = DishSchema.shape.course.options;
const TAGS = Dietary.options.filter((d) => d !== 'other');

function TagPicker({ tags, onChange }: { tags: Dietary[]; onChange: (t: Dietary[]) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-3">
      <legend className="font-medium">Suitable for</legend>
      {TAGS.map((d) => (
        <label key={d} className="flex min-h-[24px] items-center gap-2">
          <input
            type="checkbox"
            checked={tags.includes(d)}
            onChange={(e) =>
              onChange(e.target.checked ? [...tags, d] : tags.filter((t) => t !== d))
            }
          />
          {needLabel(`diet:${d}`)}
        </label>
      ))}
    </fieldset>
  );
}

/** Add a dish with its course and the dietary groups it suits (read by the coverage table). */
export function DishForm() {
  const upsertDish = useStore((s) => s.upsertDish);
  const [name, setName] = useState('');
  const [course, setCourse] = useState<Dish['course']>('main');
  const [tags, setTags] = useState<Dietary[]>([]);
  const add = () => {
    if (!name.trim()) return;
    upsertDish({ id: newId('k'), name: name.trim().slice(0, 80), course, suitableFor: tags });
    setName('');
    setTags([]);
  };

  return (
    <form
      className="card space-y-3"
      aria-label="Add a dish"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <TextField
          id="dish-name"
          label="Dish name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <SelectField
          id="dish-course"
          label="Course"
          value={course}
          onChange={(e) => setCourse(DishSchema.shape.course.parse(e.target.value))}
        >
          {COURSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
      </div>
      <TagPicker tags={tags} onChange={setTags} />
      <Button type="submit">Add dish</Button>
    </form>
  );
}
