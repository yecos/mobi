// ============================================================================
// SVG Engine - Bed Geometry Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, Point } from '../types';
import { CORNER_RADIUS } from '../styles';
import { rect, line, path, group } from '../utils/svg-builder';
import { cmToPixels } from '../utils/geometry';

/**
 * Generate bed geometry for PLANT (top-down) view
 * Shows: mattress rectangle + headboard rectangle at top + frame outline
 */
export function bedPlantView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const d = cmToPixels(dims.depth, scale);
  const mattressThick = cmToPixels(dims.mattressThickness || 25, scale);
  const headboardDepth = cmToPixels(8, scale);
  const frameInset = cmToPixels(3, scale);
  const cornerR = getBedCornerRadius(shape.cornerStyle, scale);

  // Frame outline (outer)
  if (shape.cornerStyle === 'rounded') {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      rx: cornerR, ry: cornerR,
    }));
  } else {
    parts.push(rect(x, y, w, d, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Headboard at top
  if (shape.hasBackrest || shape.backrestShape !== 'none') {
    parts.push(rect(x, y, w, headboardDepth, {
      stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
    }));
  }

  // Mattress area
  const mattressX = x + frameInset;
  const mattressY = y + headboardDepth + frameInset;
  const mattressW = w - frameInset * 2;
  const mattressD = d - headboardDepth - frameInset * 2;

  if (shape.cornerStyle === 'rounded') {
    parts.push(rect(mattressX, mattressY, mattressW, mattressD, {
      stroke: '#333333', strokeWidth: 1, fill: 'none',
      rx: Math.max(0, cornerR - frameInset), ry: Math.max(0, cornerR - frameInset),
    }));
  } else {
    parts.push(rect(mattressX, mattressY, mattressW, mattressD, {
      stroke: '#333333', strokeWidth: 1, fill: 'none',
    }));
  }

  // Pillow areas (two rectangles at the top of mattress)
  const pillowW = mattressW * 0.4;
  const pillowD = cmToPixels(12, scale);
  const pillowGap = cmToPixels(3, scale);
  const pillowY = mattressY + cmToPixels(2, scale);

  parts.push(rect(mattressX + cmToPixels(2, scale), pillowY, pillowW, pillowD, {
    stroke: '#333333', strokeWidth: 0.75, fill: 'none',
    rx: cmToPixels(3, scale), ry: cmToPixels(3, scale),
  }));
  parts.push(rect(mattressX + mattressW - pillowW - cmToPixels(2, scale), pillowY, pillowW, pillowD, {
    stroke: '#333333', strokeWidth: 0.75, fill: 'none',
    rx: cmToPixels(3, scale), ry: cmToPixels(3, scale),
  }));

  // Blanket/fold line across the mattress
  const foldLineY = mattressY + pillowD + cmToPixels(5, scale);
  parts.push(line(mattressX + cmToPixels(2, scale), foldLineY, mattressX + mattressW - cmToPixels(2, scale), foldLineY, {
    stroke: '#333333', strokeWidth: 0.75,
  }));

  return group(parts.join('\n'));
}

/**
 * Generate bed geometry for FRONTAL (front elevation) view
 * Shows: headboard + mattress + frame from front
 */
export function bedFrontalView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const h = cmToPixels(dims.height, scale);
  const mattressThick = cmToPixels(dims.mattressThickness || 25, scale);
  const headboardH = cmToPixels(dims.backrestHeight || 50, scale);
  const legH = cmToPixels(dims.legHeight || 25, scale);
  const frameH = cmToPixels(8, scale);
  const cornerR = getBedCornerRadius(shape.cornerStyle, scale);

  const bottomY = y + h;
  const mattressTopY = bottomY - mattressThick - legH;
  const frameTopY = mattressTopY - frameH;
  const headboardTopY = mattressTopY - headboardH;

  // Headboard
  if (shape.hasBackrest || shape.backrestShape !== 'none') {
    const headboardW = w;
    if (shape.backrestShape === 'curved') {
      const curveBulge = cmToPixels(5, scale);
      const headPath = `M ${x.toFixed(2)} ${mattressTopY.toFixed(2)} ` +
        `L ${x.toFixed(2)} ${(headboardTopY + curveBulge).toFixed(2)} ` +
        `Q ${(x + headboardW / 2).toFixed(2)} ${(headboardTopY - curveBulge).toFixed(2)} ` +
        `${(x + headboardW).toFixed(2)} ${(headboardTopY + curveBulge).toFixed(2)} ` +
        `L ${(x + headboardW).toFixed(2)} ${mattressTopY.toFixed(2)}`;
      parts.push(path(headPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
    } else if (shape.backrestShape === 'paneled' || shape.bodyShape === 'paneled') {
      // Paneled headboard
      parts.push(rect(x, headboardTopY, headboardW, headboardH, {
        stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      }));
      // Panel divisions
      const panelInset = cmToPixels(4, scale);
      const panelCount = Math.max(2, Math.round(dims.width / 50));
      const panelW = (headboardW - panelInset * 2) / panelCount;
      for (let i = 0; i < panelCount; i++) {
        const px = x + panelInset + i * panelW;
        parts.push(rect(px + cmToPixels(2, scale), headboardTopY + cmToPixels(3, scale),
          panelW - cmToPixels(4, scale), headboardH - cmToPixels(6, scale), {
            stroke: '#333333', strokeWidth: 0.75, fill: 'none',
          }));
      }
    } else {
      // Flat headboard
      parts.push(rect(x, headboardTopY, headboardW, headboardH, {
        stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      }));
    }
  }

  // Frame/side rail
  parts.push(rect(x, frameTopY, w, frameH, {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Mattress
  parts.push(rect(x + cmToPixels(2, scale), mattressTopY, w - cmToPixels(4, scale), mattressThick, {
    stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
  }));

  // Legs
  const legW = cmToPixels(5, scale);
  const legInset = cmToPixels(5, scale);
  parts.push(rect(x + legInset - legW / 2, bottomY - legH, legW, legH, {
    stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
  }));
  parts.push(rect(x + w - legInset - legW / 2, bottomY - legH, legW, legH, {
    stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
  }));

  return group(parts.join('\n'));
}

/**
 * Generate bed geometry for LATERAL (side elevation) view
 * Shows: side profile with headboard
 */
export function bedLateralView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const d = cmToPixels(dims.depth, scale);
  const h = cmToPixels(dims.height, scale);
  const mattressThick = cmToPixels(dims.mattressThickness || 25, scale);
  const headboardH = cmToPixels(dims.backrestHeight || 50, scale);
  const headboardDepth = cmToPixels(8, scale);
  const legH = cmToPixels(dims.legHeight || 25, scale);
  const frameH = cmToPixels(8, scale);

  const bottomY = y + h;
  const mattressTopY = bottomY - mattressThick - legH;
  const frameTopY = mattressTopY - frameH;
  const headboardTopY = mattressTopY - headboardH;

  // Headboard from side (at left edge)
  if (shape.hasBackrest || shape.backrestShape !== 'none') {
    if (shape.backrestShape === 'curved') {
      const curveBulge = cmToPixels(3, scale);
      const headPath = `M ${x.toFixed(2)} ${mattressTopY.toFixed(2)} ` +
        `L ${x.toFixed(2)} ${(headboardTopY + curveBulge).toFixed(2)} ` +
        `Q ${(x + headboardDepth / 2).toFixed(2)} ${(headboardTopY - curveBulge * 0.5).toFixed(2)} ` +
        `${(x + headboardDepth).toFixed(2)} ${headboardTopY.toFixed(2)} ` +
        `L ${(x + headboardDepth).toFixed(2)} ${mattressTopY.toFixed(2)}`;
      parts.push(path(headPath, { stroke: '#1a1a1a', strokeWidth: 2 }));
    } else {
      parts.push(rect(x, headboardTopY, headboardDepth, headboardH, {
        stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
      }));
    }
  }

  // Side rail/frame
  parts.push(rect(x + headboardDepth, frameTopY, d - headboardDepth, frameH, {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Mattress from side
  parts.push(rect(x + headboardDepth + cmToPixels(1, scale), mattressTopY,
    d - headboardDepth - cmToPixels(2, scale), mattressThick, {
      stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
    }));

  // Footboard (at right, usually lower than headboard)
  const footboardH = cmToPixels(30, scale);
  const footboardTopY = mattressTopY - footboardH;
  parts.push(rect(x + d - cmToPixels(3, scale), footboardTopY, cmToPixels(3, scale), footboardH + mattressThick + frameH, {
    stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
  }));

  // Legs from side
  const legW = cmToPixels(5, scale);
  parts.push(rect(x + headboardDepth - legW / 2, bottomY - legH, legW, legH, {
    stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
  }));
  parts.push(rect(x + d - legW / 2, bottomY - legH, legW, legH, {
    stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none',
  }));

  return group(parts.join('\n'));
}

// ============================================================================
// Bed-specific helpers
// ============================================================================

function getBedCornerRadius(cornerStyle: string, scale: number): number {
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
