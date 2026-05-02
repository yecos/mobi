// ============================================================================
// SVG Engine - Dimension Annotation Position Calculator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, DimensionAnnotation } from './types';
import { DIMENSION_SPACING } from './styles';
import { formatDimension } from './utils/geometry';
import { dimensionLine } from './utils/svg-builder';

/**
 * Bounding box of the furniture piece in SVG coordinates
 */
export interface PieceBounds {
  x: number;       // left edge
  y: number;       // top edge
  width: number;   // width in SVG px
  height: number;  // height in SVG px
}

/**
 * Calculate dimension annotations for the PLANT (top) view
 * Shows: width (horizontal) and depth (vertical)
 */
export function plantViewDimensions(
  bounds: PieceBounds,
  dims: FurnitureDimensions,
  scale: number,
  unit: 'cm' | 'in'
): DimensionAnnotation[] {
  const annotations: DimensionAnnotation[] = [];

  // Width dimension (top, horizontal)
  annotations.push({
    start: { x: bounds.x, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y },
    value: dims.width,
    unit,
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'top',
  });

  // Depth dimension (right, vertical)
  annotations.push({
    start: { x: bounds.x + bounds.width, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    value: dims.depth,
    unit,
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'right',
  });

  return annotations;
}

/**
 * Calculate dimension annotations for the FRONTAL (front elevation) view
 * Shows: width (horizontal) and height (vertical)
 * Additional: seatHeight if applicable
 */
export function frontalViewDimensions(
  bounds: PieceBounds,
  dims: FurnitureDimensions,
  scale: number,
  unit: 'cm' | 'in'
): DimensionAnnotation[] {
  const annotations: DimensionAnnotation[] = [];

  // Total width dimension (top, horizontal)
  annotations.push({
    start: { x: bounds.x, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y },
    value: dims.width,
    unit,
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'top',
  });

  // Total height dimension (right, vertical)
  annotations.push({
    start: { x: bounds.x + bounds.width, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    value: dims.height,
    unit,
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'right',
  });

  // Seat height dimension (left side, if applicable)
  if (dims.seatHeight && dims.seatHeight > 0) {
    const seatHeightPx = dims.seatHeight * scale;
    const bottomY = bounds.y + bounds.height;
    annotations.push({
      start: { x: bounds.x, y: bottomY },
      end: { x: bounds.x, y: bottomY - seatHeightPx },
      value: dims.seatHeight,
      unit,
      offset: DIMENSION_SPACING.secondDimensionOffset,
      side: 'left',
    });
  }

  // Backrest height (left side, if applicable)
  if (dims.backrestHeight && dims.backrestHeight > 0 && dims.seatHeight && dims.seatHeight > 0) {
    const seatTopY = bounds.y + bounds.height - dims.seatHeight * scale;
    const backrestTopY = seatTopY - dims.backrestHeight * scale;
    annotations.push({
      start: { x: bounds.x, y: seatTopY },
      end: { x: bounds.x, y: backrestTopY },
      value: dims.backrestHeight,
      unit,
      offset: DIMENSION_SPACING.secondDimensionOffset + DIMENSION_SPACING.dimensionOffset,
      side: 'left',
    });
  }

  return annotations;
}

/**
 * Calculate dimension annotations for the LATERAL (side elevation) view
 * Shows: depth (horizontal) and height (vertical)
 */
export function lateralViewDimensions(
  bounds: PieceBounds,
  dims: FurnitureDimensions,
  scale: number,
  unit: 'cm' | 'in'
): DimensionAnnotation[] {
  const annotations: DimensionAnnotation[] = [];

  // Depth dimension (top, horizontal)
  annotations.push({
    start: { x: bounds.x, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y },
    value: dims.depth,
    unit,
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'top',
  });

  // Total height dimension (right, vertical)
  annotations.push({
    start: { x: bounds.x + bounds.width, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    value: dims.height,
    unit,
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'right',
  });

  // Seat height (left side, if applicable)
  if (dims.seatHeight && dims.seatHeight > 0) {
    const seatHeightPx = dims.seatHeight * scale;
    const bottomY = bounds.y + bounds.height;
    annotations.push({
      start: { x: bounds.x, y: bottomY },
      end: { x: bounds.x, y: bottomY - seatHeightPx },
      value: dims.seatHeight,
      unit,
      offset: DIMENSION_SPACING.secondDimensionOffset,
      side: 'left',
    });
  }

  return annotations;
}

/**
 * Render all dimension annotations as SVG string
 */
export function renderDimensions(
  annotations: DimensionAnnotation[],
  scale: number,
  unit: 'cm' | 'in'
): string {
  const parts: string[] = [];

  for (const ann of annotations) {
    const valueStr = formatDimension(ann.value, unit);
    parts.push(dimensionLine(ann.start, ann.end, valueStr, {
      offset: ann.offset,
      side: ann.side,
      unit: ann.unit,
    }));
  }

  return parts.join('\n');
}
