import { notFound } from 'next/navigation';

/** Unknown paths render the localized not-found page inside the site layout. */
export default function Missing() {
  notFound();
}
