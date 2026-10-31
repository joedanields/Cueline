import { Link } from 'react-router';
import { Page } from './Page';

type Props = {
  title: string;
  heading?: string;
  /** Text before the link, e.g. "Add your". */
  before: string;
  to: string;
  link: string;
  /** Text after the link; defaults to " first." */
  after?: string;
};

/** A screen that can't work yet, with a link to the step that unlocks it. */
export function NeedsFirst({ title, heading, before, to, link, after = ' first.' }: Props) {
  return (
    <Page title={title} heading={heading}>
      <p className="card">
        {before}{' '}
        <Link to={to} className="underline">
          {link}
        </Link>
        {after}
      </p>
    </Page>
  );
}
