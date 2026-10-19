import { CopyText } from './copy-text';
import { Container } from './typography';

/** Readable text column for policy pages; [[...]] placeholders stay visible. */
export function Prose({ items }: { items: string[] }) {
  return (
    <Container className="py-16 sm:py-20">
      <ol className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
        {items.map((item, i) => (
          <li key={item} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6 text-lg leading-relaxed">
            <span className="font-display text-2xl font-light italic text-walnut">{i + 1}</span>
            <span>
              <CopyText>{item}</CopyText>
            </span>
          </li>
        ))}
      </ol>
    </Container>
  );
}
