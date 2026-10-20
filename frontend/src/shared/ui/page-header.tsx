import { Container, Eyebrow, Heading, Lead } from './typography';

/** Top of inner pages: quiet glow, eyebrow, display heading, optional lead. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="glow border-b border-line">
      <Container className="space-y-5 py-16 sm:py-24">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading as="h1" level="h1" className="max-w-4xl">
          {title}
        </Heading>
        {lead ? <Lead className="max-w-2xl">{lead}</Lead> : null}
        {children}
      </Container>
    </header>
  );
}
