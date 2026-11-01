/**
 * After a failed submit, move to the first field marked invalid (after React has rendered the
 * errors), so keyboard and screen-reader users land on what needs fixing.
 */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  requestAnimationFrame(() => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
