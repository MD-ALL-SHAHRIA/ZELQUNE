/** Finish colours for swatches (walnut and natural veneer); unknown finishes get the sand tone. */
export const FINISH_SWATCH: Record<string, string> = { WALNUT: '#5A3E2B', NATURAL: '#C9A67A' };

export const finishColor = (finish: string) => FINISH_SWATCH[finish] ?? '#E6E8D8';

/** The option value that names a variant (its finish), falling back to the SKU. */
export function variantValue(v: { options: Record<string, unknown>; sku: string }): string {
  return Object.values(v.options).find((x): x is string => typeof x === 'string') ?? v.sku;
}
