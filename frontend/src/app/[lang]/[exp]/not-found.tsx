import Link from 'next/link';

// not-found.tsx gets no params; the language-neutral fallback links to the default home.
export default function NotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="text-xl">We couldn&apos;t find that page. · এই পাতাটা খুঁজে পাওয়া যায়নি।</p>
      <Link href="/en" className="underline">
        Back to home
      </Link>{' '}
      ·{' '}
      <Link href="/bn" className="underline">
        হোমে ফিরে যান
      </Link>
    </div>
  );
}
