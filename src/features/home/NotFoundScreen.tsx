import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';

export default function NotFoundScreen() {
  return (
    <Page title="Page not found">
      <p>
        That page does not exist.{' '}
        <Link to="/" className="underline">
          Go to the home page
        </Link>
        .
      </p>
    </Page>
  );
}
