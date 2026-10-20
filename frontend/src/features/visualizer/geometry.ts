/**
 * Pure geometry for "See it on your wall". The piece is placed in stage-relative units so the
 * same placement drives the on-screen preview and the saved image at any resolution:
 * x, y = the piece's centre as fractions of the stage (0..1), w = its width as a fraction of the
 * stage width. The stage always has the wall photo's aspect ratio.
 */
export interface Placement {
  x: number;
  y: number;
  w: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_WIDTH = 0.08;
export const MAX_WIDTH = 0.9;
/** Arrow keys move the piece 1% of the stage (5% with Shift). */
export const KEY_STEP = 0.01;
export const KEY_STEP_LARGE = 0.05;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Width / height of the piece: from the catalog's dimensions when both are set (used only for
 * proportions, never shown), else the fallback (the photo's own ratio). Extreme values are
 * clamped so a typo never produces a sliver.
 */
export function pieceAspect(
  dims: { widthMm?: number | null; heightMm?: number | null } | null | undefined,
  fallback = 4 / 5,
): number {
  const ratio =
    dims?.widthMm && dims.heightMm && dims.widthMm > 0 && dims.heightMm > 0
      ? dims.widthMm / dims.heightMm
      : fallback;
  return clamp(Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 5, 0.4, 2.5);
}

/** The piece's height as a fraction of the stage height. */
export function heightFraction(w: number, stageAspect: number, aspect: number): number {
  return (w * stageAspect) / aspect;
}

/** Largest width that still lets the whole piece fit on the stage. */
export function maxWidth(stageAspect: number, aspect: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, aspect / stageAspect));
}

/** Keeps the piece's size within limits and the whole piece on the stage. */
export function clampPlacement(p: Placement, stageAspect: number, aspect: number): Placement {
  const w = clamp(p.w, MIN_WIDTH, maxWidth(stageAspect, aspect));
  const h = heightFraction(w, stageAspect, aspect);
  return {
    w,
    x: clamp(p.x, w / 2, 1 - w / 2),
    y: clamp(p.y, h / 2, 1 - h / 2),
  };
}

/** A calm starting point: centred, a little above the middle, about a third of the wall. */
export function initialPlacement(stageAspect: number, aspect: number): Placement {
  // Width that makes the piece 45% of the stage height, capped at 35% of the width.
  const w = Math.min(0.35, (0.45 * aspect) / stageAspect);
  return clampPlacement({ x: 0.5, y: 0.42, w }, stageAspect, aspect);
}

export function movePlacement(
  p: Placement,
  dx: number,
  dy: number,
  stageAspect: number,
  aspect: number,
): Placement {
  return clampPlacement({ ...p, x: p.x + dx, y: p.y + dy }, stageAspect, aspect);
}

/** Resizes around the piece's centre. */
export function resizePlacement(
  p: Placement,
  w: number,
  stageAspect: number,
  aspect: number,
): Placement {
  return clampPlacement({ ...p, w }, stageAspect, aspect);
}

/** Keyboard: arrows move, + / - resize. Returns null for keys the piece doesn't handle. */
export function keyAction(
  key: string,
  large: boolean,
): { dx: number; dy: number; dw: number } | null {
  const s = large ? KEY_STEP_LARGE : KEY_STEP;
  switch (key) {
    case 'ArrowLeft':
      return { dx: -s, dy: 0, dw: 0 };
    case 'ArrowRight':
      return { dx: s, dy: 0, dw: 0 };
    case 'ArrowUp':
      return { dx: 0, dy: -s, dw: 0 };
    case 'ArrowDown':
      return { dx: 0, dy: s, dw: 0 };
    case '+':
    case '=':
      return { dx: 0, dy: 0, dw: s };
    case '-':
    case '_':
      return { dx: 0, dy: 0, dw: -s };
    default:
      return null;
  }
}

/** The piece in pixels on a stage (or canvas) of the given size. */
export function pieceRect(p: Placement, stageW: number, stageH: number, aspect: number): Rect {
  const w = p.w * stageW;
  const h = w / aspect;
  return { x: p.x * stageW - w / 2, y: p.y * stageH - h / 2, w, h };
}

/** Scales (w, h) down to fit inside (maxW, maxH), never up. */
export function fitWithin(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const scale = Math.min(1, maxW / w, maxH / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/** Scales (w, h) up or down to the largest size that fits inside (maxW, maxH). */
export function containSize(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  if (w <= 0 || h <= 0 || maxW <= 0 || maxH <= 0) return { w: 0, h: 0 };
  const scale = Math.min(maxW / w, maxH / h);
  return { w: Math.floor(w * scale), h: Math.floor(h * scale) };
}

/** Source crop for drawing an image like CSS object-fit: cover into a box of the given ratio. */
export function coverCrop(
  srcW: number,
  srcH: number,
  boxAspect: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const srcAspect = srcW / srcH;
  if (srcAspect > boxAspect) {
    const sw = srcH * boxAspect;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / boxAspect;
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
}

/** File name for the saved preview, e.g. "zelqune-wave-shelf-on-my-wall.png". */
export function saveFileName(slug: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `zelqune-${safe || 'piece'}-on-my-wall.png`;
}
