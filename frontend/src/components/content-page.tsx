import { Text } from './text';

/** Simple text pages (terms, returns, privacy, FAQ). */
export function ContentPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-walnut">{title}</h1>
      {children}
    </article>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-3 pl-5 text-lg">
      {items.map((item) => (
        <li key={item}>
          <Text>{item}</Text>
        </li>
      ))}
    </ul>
  );
}
