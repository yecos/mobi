// ============================================================================
// SVG Engine - Table Geometry Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, Point } from '../types';
import { CORNER_RADIUS } from '../styles';
import { rect, line, circle, path, group } from '../utils/svg-builder';
import { cmToPixels, distributePositions } from '../utils/geometry';

/**
 * Generate table geometry for PLANT (top-down) view
 * Shows: tabletop shape + leg positions
 */
export function tablePlantView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const d = cmToPixels(dims.depth, scale);
  const topThick = cmToPixels(dims.topThickness || 3, scale);
  const cornerR = getTableCornerRadius(shape.cornerStyle, scale);

  // Table top outline
  const outline = shape.topViewOutline || 'rectangular';

  if (outline === 'round' || outline === 'circular') {
    const radius = Math.min(w, d) / 2;
    parts.push(circle(x + w / 2, y + d / 2, radius, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  } else if (outline === 'oval' || outline === 'elliptical') {
    const rx = w / 2;
    const ry = d / 2;
    const cx = x + w / 2;
    const cy = y + d / 2;
    const ovalPath = `M ${(cx - rx).toFixed(2)} ${cy.toFixed(2)} ` +
      `A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${(cx + rx).toFixed(2)} ${cy.toFixed(2)} ` +
      `A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${(cx - rx).toFixed(2)} ${cy.toFixed(2)} Z`;
    parts.push(path(ovalPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
  } else if (shape.bodyShape === 'rounded' || shape.cornerStyle === 'rounded') {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR, ry: cornerR,
    }));
  } else {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Inner edge of tabletop (thickness visible from above)
  const inset = cmToPixels(1.5, scale);
  if (outline === 'round' || outline === 'circular') {
    const radius = Math.min(w, d) / 2 - inset;
    parts.push(circle(x + w / 2, y + d / 2, Math.max(1, radius), {
      stroke: '#333333', strokeWidth: 1, fill: 'none',
    }));
  } else if (outline !== 'oval' && outline !== 'elliptical') {
    if (shape.cornerStyle === 'rounded') {
      parts.push(rect(x + inset, y + inset, w - inset * 2, d - inset * 2, {
        stroke: '#333333', strokeWidth: 1, fill: 'none',
        rx: Math.max(0, cornerR - inset), ry: Math.max(0, cornerR - inset),
      }));
    } else {
      parts.push(rect(x + inset, y + inset, w - inset * 2, d - inset * 2, {
        stroke: '#333333', strokeWidth: 1, fill: 'none',
      }));
    }
  }

  // Leg positions
  const legInset = cmToPixels(6, scale);
  const legR = cmToPixels(2.5, scale);

  if (shape.legType === 'pedestal') {
    // Single center pedestal
    const pedestalR = cmToPixels(8, scale);
    parts.push(circle(x + w / 2, y + d / 2, pedestalR, {
      stroke: '#333333', strokeWidth: 1, fill: 'none',
    }));
    parts.push(circle(x + w / 2, y + d / 2, legR, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: '#1a1a1a',
    }));
  } else if (shape.legType === 'trestre' || shape.legType === 'trestle') {
    // Trestle: two horizontal bars
    const barWidth = cmToPixels(4, scale);
    const barLength = d * 0.6;
    const barY1 = y + d / 2 - barLength / 2;
    parts.push(rect(x + legInset - barWidth / 2, barY1, barWidth, barLength, {
      stroke: '#333333', strokeWidth: 1, fill: 'none',
    }));
    parts.push(rect(x + w - legInset - barWidth / 2, barY1, barWidth, barLength, {
      stroke: '#333333', strokeWidth: 1, fill: 'none',
    }));
  } else {
    // Standard 4 legs
    const legPositions = getTableLegPositions(x, y, w, d, legInset, shape.legCount || 4, outline);
    for (const lp of legPositions) {
      parts.push(circle(lp.x, lp.y, legR, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: '#1a1a1a',
      }));
    }
  }

  return group(parts.join('\n'));
}

/**
 * Generate table geometry for FRONTAL (front elevation) view
 * Shows: horizontal top + legs below
 */
export function tableFrontalView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const h = cmToPixels(dims.height, scale);
  const topThick = cmToPixels(dims.topThickness || 3, scale);
  const legH = cmToPixels(dims.legHeight || 72, scale);
  const cornerR = getTableCornerRadius(shape.cornerStyle, scale);

  const bottomY = y + h;
  const topBottomY = y + topThick;

  // Tabletop
  const outline = shape.topViewOutline || 'rectangular';
  if (outline === 'round' || outline === 'circular') {
    // Round table from front: appears as a rectangle with slightly curved top
    parts.push(rect(x, y, w, topThick, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR * 0.3, ry: cornerR * 0.3,
    }));
  } else if (shape.cornerStyle === 'rounded') {
    parts.push(rect(x, y, w, topThick, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR * 0.3, ry: cornerR * 0.3,
    }));
  } else {
    parts.push(rect(x, y, w, topThick, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Legs
  const legInset = cmToPixels(6, scale);
  const legW = cmToPixels(4, scale);

  if (shape.legType === 'pedestal') {
    // Single pedestal column
    const pedestalW = cmToPixels(10, scale);
    const pedestalH = h * 0.3;
    parts.push(rect(x + w / 2 - pedestalW / 2, bottomY - pedestalH, pedestalW, pedestalH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    // Base feet
    const footW = cmToPixels(20, scale);
    const footH = cmToPixels(2, scale);
    parts.push(rect(x + w / 2 - footW / 2, bottomY - footH, footW, footH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
  } else if (shape.legType === 'trestre' || shape.legType === 'trestle') {
    // Trestle legs: angled supports
    const supportAngle = cmToPixels(5, scale);
    const trestlePath1 = `M ${(x + legInset).toFixed(2)} ${topBottomY.toFixed(2)} ` +
      `L ${(x + legInset - supportAngle).toFixed(2)} ${bottomY.toFixed(2)} ` +
      `L ${(x + legInset + supportAngle).toFixed(2)} ${bottomY.toFixed(2)} Z`;
    const trestlePath2 = `M ${(x + w - legInset).toFixed(2)} ${topBottomY.toFixed(2)} ` +
      `L ${(x + w - legInset - supportAngle).toFixed(2)} ${bottomY.toFixed(2)} ` +
      `L ${(x + w - legInset + supportAngle).toFixed(2)} ${bottomY.toFixed(2)} Z`;
    parts.push(path(trestlePath1, { stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' }));
    parts.push(path(trestlePath2, { stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' }));
  } else {
    // Standard straight legs
    const legPositions = [x + legInset, x + w - legInset];
    if (dims.width > 150) {
      legPositions.push(x + w / 2);
    }
    for (const lx of legPositions) {
      parts.push(rect(lx - legW / 2, topBottomY, legW, legH, {
        stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
      }));
    }
  }

  // Cross-stretcher (hidden line between legs)
  if (shape.legType !== 'pedestal' && shape.legType !== 'trestle') {
    const stretcherH = topBottomY + legH * 0.4;
    parts.push(line(x + legInset, stretcherH, x + w - legInset, stretcherH, {
      stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
    }));
  }

  return group(parts.join('\n'));
}

/**
 * Generate table geometry for LATERAL (side elevation) view
 * Shows: side view of top + legs
 */
export function tableLateralView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const d = cmToPixels(dims.depth, scale);
  const h = cmToPixels(dims.height, scale);
  const topThick = cmToPixels(dims.topThickness || 3, scale);
  const legH = cmToPixels(dims.legHeight || 72, scale);
  const cornerR = getTableCornerRadius(shape.cornerStyle, scale);

  const bottomY = y + h;
  const topBottomY = y + topThick;

  // Tabletop from side
  const outline = shape.topViewOutline || 'rectangular';
  if (outline === 'round' || outline === 'circular') {
    parts.push(rect(x, y, d, topThick, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR * 0.3, ry: cornerR * 0.3,
    }));
  } else if (shape.cornerStyle === 'rounded') {
    parts.push(rect(x, y, d, topThick, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR * 0.3, ry: cornerR * 0.3,
    }));
  } else {
    parts.push(rect(x, y, d, topThick, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Legs from side
  const legInset = cmToPixels(6, scale);
  const legW = cmToPixels(4, scale);

  if (shape.legType === 'pedestal') {
    const pedestalD = cmToPixels(8, scale);
    const pedestalH = h * 0.3;
    parts.push(rect(x + d / 2 - pedestalD / 2, bottomY - pedestalH, pedestalD, pedestalH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    const footD = cmToPixels(20, scale);
    const footH = cmToPixels(2, scale);
    parts.push(rect(x + d / 2 - footD / 2, bottomY - footH, footD, footH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
  } else if (shape.legType === 'trestre' || shape.legType === 'trestle') {
    const supportAngle = cmToPixels(3, scale);
    const trestlePath1 = `M ${(x + legInset).toFixed(2)} ${topBottomY.toFixed(2)} ` +
      `L ${(x + legInset - supportAngle).toFixed(2)} ${bottomY.toFixed(2)} ` +
      `L ${(x + legInset + supportAngle).toFixed(2)} ${bottomY.toFixed(2)} Z`;
    const trestlePath2 = `M ${(x + d - legInset).toFixed(2)} ${topBottomY.toFixed(2)} ` +
      `L ${(x + d - legInset - supportAngle).toFixed(2)} ${bottomY.toFixed(2)} ` +
      `L ${(x + d - legInset + supportAngle).toFixed(2)} ${bottomY.toFixed(2)} Z`;
    parts.push(path(trestlePath1, { stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' }));
    parts.push(path(trestlePath2, { stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' }));
  } else {
    parts.push(rect(x + legInset - legW / 2, topBottomY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
    parts.push(rect(x + d - legInset - legW / 2, topBottomY, legW, legH, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));
  }

  return group(parts.join('\n'));
}

// ============================================================================
// Table-specific helpers
// ============================================================================

function getTableCornerRadius(cornerStyle: string, scale: number): number {
  switch (cornerStyle) {
    case 'rounded':
      return CORNER_RADIUS.extraLarge * scale;
    case 'soft':
      return CORNER_RADIUS.large * scale;
    case 'sharp':
    default:
      return CORNER_RADIUS.small * scale;
  }
}

function getTableLegPositions(
  x: number,
  y: number,
  w: number,
  d: number,
  inset: number,
  count: number,
  outline: string
): Point[] {
  if (outline === 'round' || outline === 'circular') {
    const cx = x + w / 2;
    const cy = y + d / 2;
    const r = Math.min(w, d) / 2 - inset;
    const positions: Point[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    return positions;
  }

  if (count === 4) {
    return [
      { x: x + inset, y: y + inset },
      { x: x + w - inset, y: y + inset },
      { x: x + inset, y: y + d - inset },
      { x: x + w - inset, y: y + d - inset },
    ];
  }

  // Default: corners + center
  const positions: Point[] = [
    { x: x + inset, y: y + inset },
    { x: x + w - inset, y: y + inset },
    { x: x + inset, y: y + d - inset },
    { x: x + w - inset, y: y + d - inset },
  ];

  if (count > 4) {
    positions.push({ x: x + w / 2, y: y + d / 2 });
  }
  if (count > 5) {
    positions.push({ x: x + w / 2, y: y + inset });
    positions.push({ x: x + w / 2, y: y + d - inset });
  }

  return positions;
}
