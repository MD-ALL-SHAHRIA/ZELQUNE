import { Container, Eyebrow, Heading, Lead } from './typography';

/** Top of inner pages: quiet glow, eyebrow with a hairline, display heading, optional lead. */
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
      <Container className="py-16 sm:py-24 lg:py-28">
        {eyebrow ? <Eyebrow rule>{eyebrow}</Eyebrow> : null}
        <Heading as="h1" level="h1" className="mt-6 max-w-4xl sm:mt-7">
          {title}
        </Heading>
        {lead ? (
          <Lead size="lg" className="mt-6 max-w-2xl sm:mt-8">
            {lead}
          </Lead>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </Container>
    </header>
  );
}
