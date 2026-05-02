// ============================================================================
// SVG Engine - Chair Geometry Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, Point } from '../types';
import { CORNER_RADIUS } from '../styles';
import {
  rect, line, circle, arc, path, group,
} from '../utils/svg-builder';
import { cmToPixels, distributePositions } from '../utils/geometry';

/**
 * Generate chair geometry for PLANT (top-down) view
 * Shows: seat rectangle + 4 leg circles + backrest line at top
 */
export function chairPlantView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const d = cmToPixels(dims.depth, scale);
  const legR = cmToPixels(2, scale); // Leg radius ~2cm

  const cornerR = getCornerRadius(shape.cornerStyle, scale);

  // Seat outline
  if (shape.bodyShape === 'rounded' || shape.cornerStyle === 'rounded') {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a',
      strokeWidth: 2,
      rx: cornerR,
      ry: cornerR,
    }));
  } else {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a',
      strokeWidth: 2,
    }));
  }

  // Seat shape detail
  if (shape.seatShape === 'curved') {
    // Curved seat contour (inner line)
    const inset = cmToPixels(3, scale);
    const curveD = cmToPixels(1.5, scale);
    const seatPath = `M ${(x + inset).toFixed(2)} ${(y + d / 2).toFixed(2)} ` +
      `Q ${(x + w / 2).toFixed(2)} ${(y + d / 2 - curveD).toFixed(2)} ` +
      `${(x + w - inset).toFixed(2)} ${(y + d / 2).toFixed(2)}`;
    parts.push(path(seatPath, {
      stroke: '#333333',
      strokeWidth: 1,
    }));
  } else if (shape.seatShape === 'contoured') {
    // Slightly contoured seat
    const inset = cmToPixels(4, scale);
    const seatPath = `M ${(x + inset).toFixed(2)} ${(y + d * 0.6).toFixed(2)} ` +
      `C ${(x + w * 0.3).toFixed(2)} ${(y + d * 0.4).toFixed(2)}, ` +
      `${(x + w * 0.7).toFixed(2)} ${(y + d * 0.4).toFixed(2)}, ` +
      `${(x + w - inset).toFixed(2)} ${(y + d * 0.6).toFixed(2)}`;
    parts.push(path(seatPath, {
      stroke: '#333333',
      strokeWidth: 1,
    }));
  }

  // Leg positions
  const legInset = cmToPixels(4, scale);
  const legCount = shape.legCount || 4;

  if (shape.legType !== 'none' && legCount > 0) {
    const legPositions = getLegPositions(x, y, w, d, legInset, legCount, shape.legType);

    for (const lp of legPositions) {
      parts.push(circle(lp.x, lp.y, legR, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: '#1a1a1a',
      }));
    }
  }

  // Backrest (at top of chair, shown as a line/arc from above)
  if (shape.hasBackrest) {
    const backY = y;
    const backInset = cmToPixels(2, scale);

    if (shape.backrestShape === 'curved') {
      // Curved backrest from above
      const curveDepth = cmToPixels(3, scale);
      const backPath = `M ${(x + backInset).toFixed(2)} ${backY.toFixed(2)} ` +
        `Q ${(x + w / 2).toFixed(2)} ${(backY - curveDepth).toFixed(2)} ` +
        `${(x + w - backInset).toFixed(2)} ${backY.toFixed(2)}`;
      parts.push(path(backPath, {
        stroke: '#1a1a1a',
        strokeWidth: 2,
      }));
    } else if (shape.backrestShape === 'wingback') {
      // Wingback: extended sides
      const wingWidth = cmToPixels(5, scale);
      const wingDepth = cmToPixels(8, scale);
      // Left wing
      parts.push(rect(x - wingWidth + backInset, y - wingDepth, wingWidth, wingDepth + 2, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: 'none',
      }));
      // Right wing
      parts.push(rect(x + w - backInset, y - wingDepth, wingWidth, wingDepth + 2, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: 'none',
      }));
      // Backrest bar
      parts.push(line(x + backInset, y, x + w - backInset, y, {
        stroke: '#1a1a1a',
        strokeWidth: 2,
      }));
    } else {
      // Flat backrest - simple line at top
      parts.push(line(x + backInset, backY, x + w - backInset, backY, {
        stroke: '#1a1a1a',
        strokeWidth: 2,
      }));
    }
  }

  // Armrests from above
  if (shape.hasArmrests) {
    const armWidth = cmToPixels(5, scale);
    const armInset = cmToPixels(2, scale);

    if (shape.armrestShape === 'curved') {
      // Curved armrests shown as rounded rectangles
      parts.push(rect(x - armWidth, y + armInset, armWidth, d * 0.5, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: 'none',
        rx: cornerR * 0.5,
        ry: cornerR * 0.5,
      }));
      parts.push(rect(x + w, y + armInset, armWidth, d * 0.5, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: 'none',
        rx: cornerR * 0.5,
        ry: cornerR * 0.5,
      }));
    } else {
      // Straight armrests
      parts.push(rect(x - armWidth, y + armInset, armWidth, d * 0.5, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: 'none',
      }));
      parts.push(rect(x + w, y + armInset, armWidth, d * 0.5, {
        stroke: '#1a1a1a',
        strokeWidth: 1.5,
        fill: 'none',
      }));
    }
  }

  return group(parts.join('\n'));
}

/**
 * Generate chair geometry for FRONTAL (front elevation) view
 * Shows: seat panel + legs + backrest + armrests
 */
export function chairFrontalView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const h = cmToPixels(dims.height, scale);
  const seatH = cmToPixels(dims.seatHeight || 45, scale);
  const backrestH = cmToPixels(dims.backrestHeight || 40, scale);
  const legH = cmToPixels(dims.legHeight || 45, scale);
  const seatThickness = cmToPixels(4, scale);
  const cornerR = getCornerRadius(shape.cornerStyle, scale);

  // Bottom of chair (floor level)
  const bottomY = y + h;
  // Top of seat
  const seatTopY = bottomY - seatH;
  // Top of backrest
  const backrestTopY = seatTopY - backrestH;

  // Legs
  if (shape.legType !== 'none') {
    const legW = cmToPixels(3, scale);
    const legInset = cmToPixels(4, scale);

    if (shape.legType === 'cabriole') {
      // Cabriole legs: S-curved
      const leg1Path = buildCabrioleLeg(x + legInset, bottomY, legH, legW, false);
      const leg2Path = buildCabrioleLeg(x + w - legInset, bottomY, legH, legW, true);
      parts.push(path(leg1Path, { stroke: '#1a1a1a', strokeWidth: 1.5 }));
      parts.push(path(leg2Path, { stroke: '#1a1a1a', strokeWidth: 1.5 }));
    } else if (shape.legType === 'trestre' || shape.legType === 'trestle') {
      // Trestle: two vertical legs with horizontal bar
      parts.push(rect(x + legInset - legW / 2, seatTopY, legW, legH, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      parts.push(rect(x + w - legInset - legW / 2, seatTopY, legW, legH, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      // Horizontal stretcher
      const stretcherY = seatTopY + legH * 0.5;
      parts.push(line(x + legInset, stretcherY, x + w - legInset, stretcherY, {
        stroke: '#333333', strokeWidth: 1,
      }));
    } else {
      // Straight legs (default)
      parts.push(rect(x + legInset - legW / 2, seatTopY, legW, legH, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      parts.push(rect(x + w - legInset - legW / 2, seatTopY, legW, legH, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    }
  }

  // Seat panel
  if (shape.cornerStyle === 'rounded') {
    parts.push(rect(x, seatTopY - seatThickness, w, seatThickness, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR * 0.3, ry: cornerR * 0.3,
    }));
  } else {
    parts.push(rect(x, seatTopY - seatThickness, w, seatThickness, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Backrest
  if (shape.hasBackrest) {
    if (shape.backrestShape === 'curved') {
      // Curved backrest
      const curveBulge = cmToPixels(3, scale);
      const backPath = `M ${x.toFixed(2)} ${seatTopY.toFixed(2)} ` +
        `L ${x.toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `Q ${(x + w / 2).toFixed(2)} ${(backrestTopY - curveBulge).toFixed(2)} ` +
        `${(x + w).toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `L ${(x + w).toFixed(2)} ${seatTopY.toFixed(2)}`;
      parts.push(path(backPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
    } else if (shape.backrestShape === 'wingback') {
      // Wingback: side panels extend forward
      const wingExt = cmToPixels(8, scale);
      const wingW = cmToPixels(5, scale);
      // Main backrest
      parts.push(rect(x, backrestTopY, w, seatTopY - backrestTopY, {
        stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      }));
      // Left wing
      parts.push(rect(x - wingW, backrestTopY, wingW, wingExt, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      // Right wing
      parts.push(rect(x + w, backrestTopY, wingW, wingExt, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    } else {
      // Flat backrest (default)
      parts.push(rect(x, backrestTopY, w, seatTopY - backrestTopY, {
        stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      }));
    }
  }

  // Armrests from front
  if (shape.hasArmrests) {
    const armH = cmToPixels(dims.armrestHeight || 65, scale) - seatH;
    const armW = cmToPixels(5, scale);
    const armTopY = seatTopY - armH - seatThickness;

    if (shape.armrestShape === 'curved') {
      // Curved armrests
      const armPath1 = `M ${(x - armW).toFixed(2)} ${(armTopY + armH).toFixed(2)} ` +
        `L ${(x - armW).toFixed(2)} ${(armTopY + cmToPixels(2, scale)).toFixed(2)} ` +
        `Q ${(x - armW).toFixed(2)} ${armTopY.toFixed(2)} ` +
        `${(x - armW + cmToPixels(2, scale)).toFixed(2)} ${armTopY.toFixed(2)} ` +
        `L ${x.toFixed(2)} ${armTopY.toFixed(2)}`;
      parts.push(path(armPath1, { stroke: '#1a1a1a', strokeWidth: 1.5 }));

      const armPath2 = `M ${x.toFixed(2)} ${armTopY.toFixed(2)} ` +
        `L ${(x + w).toFixed(2)} ${armTopY.toFixed(2)}`;
      parts.push(path(armPath2, { stroke: '#333333', strokeWidth: 1, strokeDasharray: '8,4' }));
    } else {
      // Straight armrests shown as vertical posts
      parts.push(rect(x - armW, armTopY, armW, armH + seatThickness, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
      parts.push(rect(x + w, armTopY, armW, armH + seatThickness, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    }
  }

  return group(parts.join('\n'));
}

/**
 * Generate chair geometry for LATERAL (side elevation) view
 * Shows: seat profile + 2 legs (front/back) + backrest angle/curve
 */
export function chairLateralView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const d = cmToPixels(dims.depth, scale);
  const h = cmToPixels(dims.height, scale);
  const seatH = cmToPixels(dims.seatHeight || 45, scale);
  const backrestH = cmToPixels(dims.backrestHeight || 40, scale);
  const legH = cmToPixels(dims.legHeight || 45, scale);
  const seatThickness = cmToPixels(4, scale);

  const bottomY = y + h;
  const seatTopY = bottomY - seatH;
  const backrestTopY = seatTopY - backrestH;

  // Legs from side (2 visible)
  const legW = cmToPixels(3, scale);
  const legInset = cmToPixels(3, scale);

  if (shape.legType === 'cabriole') {
    const leg1Path = buildCabrioleLeg(x + legInset, bottomY, legH, legW, false);
    const leg2Path = buildCabrioleLeg(x + d - legInset, bottomY, legH, legW, true);
    parts.push(path(leg1Path, { stroke: '#1a1a1a', strokeWidth: 1.5 }));
    parts.push(path(leg2Path, { stroke: '#1a1a1a', strokeWidth: 1.5 }));
  } else if (shape.legType !== 'none') {
    parts.push(rect(x + legInset - legW / 2, seatTopY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    parts.push(rect(x + d - legInset - legW / 2, seatTopY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
  }

  // Seat panel
  parts.push(rect(x, seatTopY - seatThickness, d, seatThickness, {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Backrest from side
  if (shape.hasBackrest) {
    const backThickness = cmToPixels(3, scale);
    if (shape.backrestShape === 'curved') {
      // Curved backrest from side
      const curveBulge = cmToPixels(2, scale);
      const backPath = `M ${(x + d * 0.15).toFixed(2)} ${seatTopY.toFixed(2)} ` +
        `Q ${(x + d * 0.1).toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `${(x + d * 0.15).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `L ${(x + d * 0.15 + backThickness).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `Q ${(x + d * 0.1 + backThickness).toFixed(2)} ${(backrestTopY + curveBulge).toFixed(2)} ` +
        `${(x + d * 0.15 + backThickness).toFixed(2)} ${seatTopY.toFixed(2)}`;
      parts.push(path(backPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
    } else {
      // Straight/slightly reclined backrest
      const reclineOffset = cmToPixels(2, scale);
      const backPath = `M ${(x + d * 0.15).toFixed(2)} ${seatTopY.toFixed(2)} ` +
        `L ${(x + d * 0.15 - reclineOffset).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `L ${(x + d * 0.15 + backThickness - reclineOffset).toFixed(2)} ${backrestTopY.toFixed(2)} ` +
        `L ${(x + d * 0.15 + backThickness).toFixed(2)} ${seatTopY.toFixed(2)} Z`;
      parts.push(path(backPath, { stroke: '#1a1a1a', strokeWidth: 2, fill: 'none' }));
    }
  }

  // Armrest from side
  if (shape.hasArmrests) {
    const armH = cmToPixels(dims.armrestHeight || 65, scale) - seatH;
    const armTopY = seatTopY - armH - seatThickness;
    const armDepth = cmToPixels(dims.depth * 0.35, scale);

    parts.push(rect(x + d * 0.05, armTopY, armDepth, seatThickness, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    // Armrest support post (hidden line)
    parts.push(line(x + d * 0.05 + armDepth / 2, armTopY + seatThickness, x + d * 0.05 + armDepth / 2, seatTopY, {
      stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
    }));
  }

  return group(parts.join('\n'));
}

// ============================================================================
// Chair-specific helper functions
// ============================================================================

/**
 * Get corner radius based on corner style
 */
function getCornerRadius(cornerStyle: string, scale: number): number {
  switch (cornerStyle) {
    case 'rounded':
      return CORNER_RADIUS.large * scale;
    case 'soft':
      return CORNER_RADIUS.medium * scale;
    case 'sharp':
    default:
      return CORNER_RADIUS.small * scale;
  }
}

/**
 * Get leg positions for a given number of legs and type
 */
function getLegPositions(
  x: number,
  y: number,
  w: number,
  d: number,
  inset: number,
  count: number,
  legType: string
): Point[] {
  if (legType === 'pedestal') {
    // Single center pedestal
    return [{ x: x + w / 2, y: y + d / 2 }];
  }

  if (count === 4) {
    // Standard 4 legs at corners
    return [
      { x: x + inset, y: y + inset },
      { x: x + w - inset, y: y + inset },
      { x: x + inset, y: y + d - inset },
      { x: x + w - inset, y: y + d - inset },
    ];
  }

  if (count === 6) {
    // 6 legs: 4 corners + 2 middle sides
    return [
      { x: x + inset, y: y + inset },
      { x: x + w / 2, y: y + inset },
      { x: x + w - inset, y: y + inset },
      { x: x + inset, y: y + d - inset },
      { x: x + w / 2, y: y + d - inset },
      { x: x + w - inset, y: y + d - inset },
    ];
  }

  // Default: distribute along perimeter
  const positions: Point[] = [];
  const topPositions = distributePositions(x + inset, x + w - inset, Math.ceil(count / 2));
  const bottomPositions = distributePositions(x + inset, x + w - inset, Math.floor(count / 2));

  for (const px of topPositions) {
    positions.push({ x: px, y: y + inset });
  }
  for (const px of bottomPositions) {
    positions.push({ x: px, y: y + d - inset });
  }

  return positions;
}

/**
 * Build a cabriole leg path (S-curve)
 */
function buildCabrioleLeg(
  baseX: number,
  baseY: number,
  height: number,
  width: number,
  mirror: boolean
): string {
  const dir = mirror ? -1 : 1;
  const topY = baseY - height;
  const midY = baseY - height * 0.5;
  const curve1 = width * 1.5;
  const curve2 = width * 0.8;

  return `M ${baseX.toFixed(2)} ${baseY.toFixed(2)} ` +
    `C ${(baseX + dir * curve1).toFixed(2)} ${baseY.toFixed(2)} ` +
    `${(baseX + dir * curve2).toFixed(2)} ${(midY + height * 0.15).toFixed(2)} ` +
    `${baseX.toFixed(2)} ${midY.toFixed(2)} ` +
    `C ${(baseX - dir * curve2).toFixed(2)} ${(midY - height * 0.15).toFixed(2)} ` +
    `${(baseX - dir * curve1 * 0.3).toFixed(2)} ${topY.toFixed(2)} ` +
    `${baseX.toFixed(2)} ${topY.toFixed(2)}`;
}
