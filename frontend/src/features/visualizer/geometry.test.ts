import { describe, expect, it } from 'vitest';
import {
  clampPlacement,
  containSize,
  coverCrop,
  fitWithin,
  heightFraction,
  initialPlacement,
  keyAction,
  MAX_WIDTH,
  maxWidth,
  MIN_WIDTH,
  movePlacement,
  pieceAspect,
  pieceRect,
  resizePlacement,
  saveFileName,
} from './geometry';

describe('pieceAspect', () => {
  it('uses catalog dimensions for proportions', () => {
    expect(pieceAspect({ widthMm: 600, heightMm: 1000 })).toBeCloseTo(0.6);
  });
  it('falls back when dimensions are missing or invalid', () => {
    expect(pieceAspect(null, 1.5)).toBe(1.5);
    expect(pieceAspect({ widthMm: 600, heightMm: null }, 0.8)).toBe(0.8);
    expect(pieceAspect({ widthMm: 0, heightMm: 500 }, 0.8)).toBe(0.8);
    expect(pieceAspect(undefined, Number.NaN)).toBe(0.8);
  });
  it('clamps extreme ratios', () => {
    expect(pieceAspect({ widthMm: 10, heightMm: 1000 })).toBe(0.4);
    expect(pieceAspect({ widthMm: 5000, heightMm: 100 })).toBe(2.5);
  });
});

describe('placement', () => {
  const stage = 4 / 3; // landscape wall photo
  const aspect = 0.6; // tall shelf

  it('starts centred, inside the stage, within the size limits', () => {
    const p = initialPlacement(stage, aspect);
    expect(p.x).toBe(0.5);
    expect(p.w).toBeGreaterThanOrEqual(MIN_WIDTH);
    expect(p.w).toBeLessThanOrEqual(0.35);
    expect(heightFraction(p.w, stage, aspect)).toBeCloseTo(0.45);
  });

  it('never lets the piece leave the stage', () => {
    const p = movePlacement({ x: 0.5, y: 0.5, w: 0.2 }, 5, -5, stage, aspect);
    const h = heightFraction(p.w, stage, aspect);
    expect(p.x).toBeCloseTo(1 - p.w / 2);
    expect(p.y).toBeCloseTo(h / 2);
  });

  it('limits the width so the whole piece fits', () => {
    expect(maxWidth(stage, aspect)).toBeCloseTo(0.45);
    expect(maxWidth(0.5, 2)).toBe(MAX_WIDTH);
    const p = resizePlacement({ x: 0.5, y: 0.5, w: 0.2 }, 0.99, stage, aspect);
    expect(p.w).toBeCloseTo(0.45);
    expect(heightFraction(p.w, stage, aspect)).toBeLessThanOrEqual(1 + 1e-9);
    expect(resizePlacement(p, 0.001, stage, aspect).w).toBe(MIN_WIDTH);
  });

  it('keeps a valid placement unchanged', () => {
    const p = { x: 0.4, y: 0.5, w: 0.2 };
    expect(clampPlacement(p, stage, aspect)).toEqual(p);
  });
});

describe('keyAction', () => {
  it('maps arrows to moves and +/- to resizing, larger with Shift', () => {
    expect(keyAction('ArrowLeft', false)).toEqual({ dx: -0.01, dy: 0, dw: 0 });
    expect(keyAction('ArrowDown', true)).toEqual({ dx: 0, dy: 0.05, dw: 0 });
    expect(keyAction('+', false)).toEqual({ dx: 0, dy: 0, dw: 0.01 });
    expect(keyAction('-', false)).toEqual({ dx: 0, dy: 0, dw: -0.01 });
    expect(keyAction('Enter', false)).toBeNull();
  });
});

describe('pixel geometry', () => {
  it('maps a placement to pixels at any resolution', () => {
    const p = { x: 0.5, y: 0.5, w: 0.25 };
    expect(pieceRect(p, 800, 600, 0.5)).toEqual({ x: 300, y: 100, w: 200, h: 400 });
    expect(pieceRect(p, 1600, 1200, 0.5)).toEqual({ x: 600, y: 200, w: 400, h: 800 });
  });

  it('fits images within a cap without upscaling', () => {
    expect(fitWithin(4000, 3000, 2000, 2000)).toEqual({ w: 2000, h: 1500 });
    expect(fitWithin(800, 600, 2000, 2000)).toEqual({ w: 800, h: 600 });
    expect(fitWithin(0, 600, 2000, 2000)).toEqual({ w: 0, h: 0 });
  });

  it('contains a ratio inside a box (up or down)', () => {
    expect(containSize(4, 3, 400, 400)).toEqual({ w: 400, h: 300 });
    expect(containSize(3, 4, 400, 400)).toEqual({ w: 300, h: 400 });
    expect(containSize(3, 4, 0, 400)).toEqual({ w: 0, h: 0 });
  });

  it('crops like object-fit: cover', () => {
    expect(coverCrop(1000, 500, 1)).toEqual({ sx: 250, sy: 0, sw: 500, sh: 500 });
    expect(coverCrop(500, 1000, 1)).toEqual({ sx: 0, sy: 250, sw: 500, sh: 500 });
  });
});

describe('saveFileName', () => {
  it('builds a safe file name', () => {
    expect(saveFileName('wave-shelf')).toBe('zelqune-wave-shelf-on-my-wall.png');
    expect(saveFileName('../Odd Name!')).toBe('zelqune-odd-name-on-my-wall.png');
    expect(saveFileName('')).toBe('zelqune-piece-on-my-wall.png');
  });
});
