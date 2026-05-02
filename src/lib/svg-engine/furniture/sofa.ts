// ============================================================================
// SVG Engine - Sofa Geometry Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, Point } from '../types';
import { CORNER_RADIUS } from '../styles';
import { rect, line, circle, arc, path, group } from '../utils/svg-builder';
import { cmToPixels, distributePositions } from '../utils/geometry';

/**
 * Generate sofa geometry for PLANT (top-down) view
 * Shows: main body + armrests + back cushion line + seat cushion divisions
 */
export function sofaPlantView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const d = cmToPixels(dims.depth, scale);
  const cornerR = getSofaCornerRadius(shape.cornerStyle, scale);
  const backDepth = cmToPixels(15, scale); // Backrest depth from top

  // Main body outline
  if (shape.bodyShape === 'rounded' || shape.cornerStyle === 'rounded') {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR, ry: cornerR,
    }));
  } else if (shape.bodyShape === 'l-shape') {
    // L-shaped sofa
    const lWidth = w * 0.6;
    const lDepth = d * 0.6;
    const lPath = `M ${(x + cornerR).toFixed(2)} ${y.toFixed(2)} ` +
      `L ${(x + lWidth - cornerR).toFixed(2)} ${y.toFixed(2)} ` +
      `Q ${x + lWidth} ${y} ${x + lWidth} ${(y + cornerR).toFixed(2)} ` +
      `L ${(x + lWidth).toFixed(2)} ${(y + lDepth - cornerR).toFixed(2)} ` +
      `Q ${x + lWidth} ${y + lDepth} ${(x + lWidth + cornerR).toFixed(2)} ${(y + lDepth).toFixed(2)} ` +
      `L ${(x + w - cornerR).toFixed(2)} ${(y + lDepth).toFixed(2)} ` +
      `Q ${x + w} ${y + lDepth} ${x + w} ${(y + lDepth + cornerR).toFixed(2)} ` +
      `L ${x + w} ${(y + d - cornerR).toFixed(2)} ` +
      `Q ${x + w} ${y + d} ${(x + w - cornerR).toFixed(2)} ${(y + d).toFixed(2)} ` +
      `L ${(x + cornerR).toFixed(2)} ${(y + d).toFixed(2)} ` +
      `Q ${x} ${y + d} ${x} ${(y + d - cornerR).toFixed(2)} ` +
      `L ${x} ${(y + cornerR).toFixed(2)} ` +
      `Q ${x} ${y} ${(x + cornerR).toFixed(2)} ${y} Z`;
    parts.push(path(lPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
  } else {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Backrest line (top portion)
  if (shape.hasBackrest) {
    const backInset = cmToPixels(3, scale);
    if (shape.backrestShape === 'curved') {
      const curveDepth = cmToPixels(2, scale);
      const backPath = `M ${(x + backInset).toFixed(2)} ${(y + backDepth).toFixed(2)} ` +
        `Q ${(x + w / 2).toFixed(2)} ${(y + backDepth - curveDepth).toFixed(2)} ` +
        `${(x + w - backInset).toFixed(2)} ${(y + backDepth).toFixed(2)}`;
      parts.push(path(backPath, { stroke: '#333333', strokeWidth: 1 }));
    } else {
      parts.push(line(x + backInset, y + backDepth, x + w - backInset, y + backDepth, {
        stroke: '#333333', strokeWidth: 1,
      }));
    }
  }

  // Seat cushion divisions (2 or 3 cushions)
  const numCushions = Math.max(2, Math.round(dims.width / 70));
  const cushionWidth = w / numCushions;
  const seatTop = shape.hasBackrest ? y + backDepth : y;

  for (let i = 1; i < numCushions; i++) {
    const cx = x + i * cushionWidth;
    parts.push(line(cx, seatTop + cmToPixels(2, scale), cx, y + d - cmToPixels(2, scale), {
      stroke: '#333333', strokeWidth: 1,
    }));
  }

  // Armrests from above
  if (shape.hasArmrests) {
    const armWidth = cmToPixels(12, scale);
    const armInset = cmToPixels(3, scale);

    if (shape.armrestShape === 'curved') {
      // Rounded armrest outlines
      parts.push(rect(x - armWidth, y + armInset, armWidth, d - armInset * 2, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
        rx: cornerR * 0.4, ry: cornerR * 0.4,
      }));
      parts.push(rect(x + w, y + armInset, armWidth, d - armInset * 2, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
        rx: cornerR * 0.4, ry: cornerR * 0.4,
      }));
    } else {
      // Square armrest outlines
      parts.push(rect(x - armWidth, y + armInset, armWidth, d - armInset * 2, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      parts.push(rect(x + w, y + armInset, armWidth, d - armInset * 2, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    }
  }

  // Leg positions
  const legInset = cmToPixels(8, scale);
  const legR = cmToPixels(1.5, scale);
  if (shape.legType !== 'none') {
    const legPositions: Point[] = [
      { x: x + legInset, y: y + d - legInset },
      { x: x + w - legInset, y: y + d - legInset },
      { x: x + legInset, y: y + legInset + (shape.hasBackrest ? backDepth : 0) },
      { x: x + w - legInset, y: y + legInset + (shape.hasBackrest ? backDepth : 0) },
    ];
    // Additional center legs for long sofas
    if (dims.width > 160) {
      legPositions.push(
        { x: x + w / 2, y: y + legInset + (shape.hasBackrest ? backDepth : 0) },
        { x: x + w / 2, y: y + d - legInset }
      );
    }
    for (const lp of legPositions) {
      parts.push(circle(lp.x, lp.y, legR, {
        stroke: '#1a1a1a', strokeWidth: 1, fill: '#1a1a1a',
      }));
    }
  }

  return group(parts.join('\n'));
}

/**
 * Generate sofa geometry for FRONTAL (front elevation) view
 * Shows: body + armrests + backrest + legs
 */
export function sofaFrontalView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const h = cmToPixels(dims.height, scale);
  const seatH = cmToPixels(dims.seatHeight || 43, scale);
  const backrestH = cmToPixels(dims.backrestHeight || 45, scale);
  const legH = cmToPixels(dims.legHeight || 15, scale);
  const seatThickness = cmToPixels(10, scale);
  const cornerR = getSofaCornerRadius(shape.cornerStyle, scale);

  const bottomY = y + h;
  const seatTopY = bottomY - seatH;
  const backrestTopY = seatTopY - backrestH;
  const legTopY = bottomY - legH;

  // Legs (short, often barely visible)
  if (shape.legType !== 'none') {
    const legW = cmToPixels(3, scale);
    const legInset = cmToPixels(8, scale);
    parts.push(rect(x + legInset - legW / 2, legTopY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    parts.push(rect(x + w - legInset - legW / 2, legTopY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    if (dims.width > 160) {
      parts.push(rect(x + w / 2 - legW / 2, legTopY, legW, legH, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    }
  }

  // Main body (seat + base)
  if (shape.cornerStyle === 'rounded') {
    parts.push(rect(x, seatTopY - seatThickness, w, seatThickness + (seatH - legH), {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR * 0.3, ry: cornerR * 0.3,
    }));
  } else {
    parts.push(rect(x, seatTopY - seatThickness, w, seatThickness + (seatH - legH), {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Seat cushion top line
  parts.push(line(x + cmToPixels(2, scale), seatTopY - seatThickness, x + w - cmToPixels(2, scale), seatTopY - seatThickness, {
    stroke: '#333333', strokeWidth: 1,
  }));

  // Cushion divisions on front face
  const numCushions = Math.max(2, Math.round(dims.width / 70));
  const cushionWidth = w / numCushions;
  for (let i = 1; i < numCushions; i++) {
    const cx = x + i * cushionWidth;
    parts.push(line(cx, seatTopY - seatThickness, cx, bottomY - legH, {
      stroke: '#333333', strokeWidth: 1,
    }));
  }

  // Backrest
  if (shape.hasBackrest) {
    if (shape.backrestShape === 'curved') {
      const curveBulge = cmToPixels(5, scale);
      const backPath = `M ${x.toFixed(2)} ${seatTopY.toFixed(2)} ` +
        `L ${x.toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `Q ${(x + w / 2).toFixed(2)} ${(backrestTopY - curveBulge).toFixed(2)} ` +
        `${(x + w).toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `L ${(x + w).toFixed(2)} ${seatTopY.toFixed(2)}`;
      parts.push(path(backPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
    } else {
      // Straight backrest
      parts.push(rect(x, backrestTopY, w, seatTopY - backrestTopY, {
        stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      }));
    }
  }

  // Armrests from front
  if (shape.hasArmrests) {
    const armH = cmToPixels(dims.armrestHeight || 60, scale) - seatH;
    const armW = cmToPixels(12, scale);
    const armTopY = seatTopY - armH - seatThickness;

    if (shape.armrestShape === 'curved') {
      parts.push(rect(x - armW, armTopY, armW, armH + seatThickness + (seatH - legH), {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
        rx: cornerR * 0.4, ry: cornerR * 0.4,
      }));
      parts.push(rect(x + w, armTopY, armW, armH + seatThickness + (seatH - legH), {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
        rx: cornerR * 0.4, ry: cornerR * 0.4,
      }));
    } else {
      parts.push(rect(x - armW, armTopY, armW, armH + seatThickness + (seatH - legH), {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      parts.push(rect(x + w, armTopY, armW, armH + seatThickness + (seatH - legH), {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    }
  }

  return group(parts.join('\n'));
}

/**
 * Generate sofa geometry for LATERAL (side elevation) view
 * Shows: body depth profile + seat + backrest curve/angle + armrest profile
 */
export function sofaLateralView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const d = cmToPixels(dims.depth, scale);
  const h = cmToPixels(dims.height, scale);
  const seatH = cmToPixels(dims.seatHeight || 43, scale);
  const backrestH = cmToPixels(dims.backrestHeight || 45, scale);
  const legH = cmToPixels(dims.legHeight || 15, scale);
  const seatThickness = cmToPixels(10, scale);
  const backDepth = cmToPixels(15, scale);

  const bottomY = y + h;
  const seatTopY = bottomY - seatH;
  const backrestTopY = seatTopY - backrestH;
  const legTopY = bottomY - legH;

  // Legs from side
  if (shape.legType !== 'none') {
    const legW = cmToPixels(3, scale);
    const legInset = cmToPixels(5, scale);
    parts.push(rect(x + legInset - legW / 2, legTopY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    parts.push(rect(x + d - legInset - legW / 2, legTopY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
  }

  // Seat base/body from side
  parts.push(rect(x, seatTopY - seatThickness, d, seatThickness + (seatH - legH), {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Seat surface line
  parts.push(line(x + cmToPixels(1, scale), seatTopY - seatThickness, x + d - cmToPixels(1, scale), seatTopY - seatThickness, {
    stroke: '#333333', strokeWidth: 1,
  }));

  // Backrest from side
  if (shape.hasBackrest) {
    const backThickness = cmToPixels(10, scale);
    if (shape.backrestShape === 'curved') {
      const curveBulge = cmToPixels(4, scale);
      const backPath = `M ${(x + backDepth).toFixed(2)} ${seatTopY.toFixed(2)} ` +
        `Q ${(x + backDepth * 0.5).toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `${(x + backDepth * 0.8).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `L ${(x + backDepth * 0.8 + backThickness).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `Q ${(x + backDepth * 0.5 + backThickness).toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `${(x + backDepth + backThickness).toFixed(2)} ${seatTopY.toFixed(2)} Z`;
      parts.push(path(backPath, { stroke: '#1a1a1a', strokeWidth: 2, fill: 'none' }));
    } else {
      // Reclined straight backrest
      const reclineOffset = cmToPixels(3, scale);
      const backPath = `M ${(x + backDepth).toFixed(2)} ${seatTopY.toFixed(2)} ` +
        `L ${(x + backDepth - reclineOffset).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `L ${(x + backDepth + backThickness - reclineOffset).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `L ${(x + backDepth + backThickness).toFixed(2)} ${seatTopY.toFixed(2)} Z`;
      parts.push(path(backPath, { stroke: '#1a1a1a', strokeWidth: 2, fill: 'none' }));
    }
  }

  // Armrest from side
  if (shape.hasArmrests) {
    const armH = cmToPixels(dims.armrestHeight || 60, scale) - seatH;
    const armTopY = seatTopY - armH - seatThickness;
    const armFrontDepth = cmToPixels(dims.depth * 0.4, scale);

    parts.push(rect(x + d * 0.05, armTopY, armFrontDepth, seatThickness, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    // Armrest vertical support (hidden line)
    parts.push(line(x + d * 0.05 + armFrontDepth * 0.5, armTopY + seatThickness, x + d * 0.05 + armFrontDepth * 0.5, seatTopY, {
      stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
    }));
  }

  return group(parts.join('\n'));
}

// ============================================================================
// Sofa-specific helpers
// ============================================================================

function getSofaCornerRadius(cornerStyle: string, scale: number): number {
  switch (cornerStyle) {
    case 'rounded':
      return CORNER_RADIUS.extraLarge * scale;
    case 'soft':
      return CORNER_RADIUS.large * scale;
    case 'sharp':
    default:
      return CORNER_RADIUS.medium * scale;
  }
}
