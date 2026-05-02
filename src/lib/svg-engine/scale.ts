// ============================================================================
// SVG Engine - Adaptive Scale Calculator
// MOBI Furniture Plan Application
// ============================================================================

import { STANDARD_SCALES, CANVAS } from './styles';
import type { FurnitureDimensions, SVGViewConfig } from './types';

/**
 * Calculate the best scale for the furniture dimensions
 * Furniture should occupy ~60-70% of the SVG area, leaving room for dimensions
 */
export function calculateScale(
  dims: FurnitureDimensions,
  viewType: 'plant' | 'frontal' | 'lateral',
  svgWidth: number = CANVAS.defaultWidth,
  svgHeight: number = CANVAS.defaultHeight
): number {
  const padding = CANVAS.padding;
  const availableWidth = svgWidth - padding * 2;
  const availableHeight = svgHeight - padding * 2;
  const targetRatio = CANVAS.furnitureAreaRatio;

  // Get the relevant dimensions for this view
  let furnitureWidthCm: number;
  let furnitureHeightCm: number;

  switch (viewType) {
    case 'plant':
      furnitureWidthCm = dims.width;
      furnitureHeightCm = dims.depth;
      break;
    case 'frontal':
      furnitureWidthCm = dims.width;
      furnitureHeightCm = dims.height;
      break;
    case 'lateral':
      furnitureWidthCm = dims.depth;
      furnitureHeightCm = dims.height;
      break;
  }

  // Ensure non-zero dimensions
  furnitureWidthCm = Math.max(furnitureWidthCm, 1);
  furnitureHeightCm = Math.max(furnitureHeightCm, 1);

  // Calculate scale that would make furniture fit at target ratio
  const scaleX = (availableWidth * targetRatio) / furnitureWidthCm;
  const scaleY = (availableHeight * targetRatio) / furnitureHeightCm;
  const idealScale = Math.min(scaleX, scaleY);

  // Snap to the nearest standard scale that gives equal or smaller result
  const scaleValue = 1 / idealScale; // This is the X in 1:X
  const snappedScale = snapToStandardScale(scaleValue);

  return 1 / snappedScale;
}

/**
 * Snap to the nearest standard architectural scale (1:X)
 * Choose the scale that is closest but gives equal or slightly larger representation
 */
function snapToStandardScale(scaleX: number): number {
  const scales: number[] = [...STANDARD_SCALES];

  // If scale is smaller than the smallest standard, use the smallest
  if (scaleX <= scales[0]) {
    return scales[0];
  }

  // If scale is larger than the largest standard, use the largest
  if (scaleX >= scales[scales.length - 1]) {
    return scales[scales.length - 1];
  }

  // Find the closest standard scale
  let closest: number = scales[0];
  let minDiff = Math.abs(scales[0] - scaleX);

  for (const standard of scales) {
    const diff = Math.abs(standard - scaleX);
    if (diff < minDiff) {
      minDiff = diff;
      closest = standard;
    }
  }

  return closest;
}

/**
 * Calculate the SVG view config for a specific view type
 */
export function calculateViewConfig(
  dims: FurnitureDimensions,
  viewType: 'plant' | 'frontal' | 'lateral',
  options: {
    showDimensions?: boolean;
    unit?: 'cm' | 'in';
  } = {}
): SVGViewConfig {
  const {
    showDimensions = true,
    unit = 'cm',
  } = options;

  const svgWidth = CANVAS.defaultWidth;
  const svgHeight = CANVAS.defaultHeight;
  const scale = calculateScale(dims, viewType, svgWidth, svgHeight);

  return {
    viewType,
    width: svgWidth,
    height: svgHeight,
    padding: CANVAS.padding,
    scale,
    showDimensions,
    unit,
    referenceBar: true,
  };
}

/**
 * Calculate the scale bar length in cm
 * Should be a round number (10, 20, 50, 100, etc.) that fits nicely
 */
export function calculateScaleBarLength(scale: number, availableWidth: number): number {
  // The scale bar should be ~30-40% of the available width
  const targetPxWidth = availableWidth * 0.35;
  const targetCm = targetPxWidth / scale;

  // Round to a nice number
  const niceValues = [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200];
  let best = niceValues[0];
  let bestDiff = Math.abs(niceValues[0] - targetCm);

  for (const val of niceValues) {
    const diff = Math.abs(val - targetCm);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = val;
    }
  }

  return best;
}

/**
 * Calculate the bounding box of the furniture piece in SVG coordinates
 * (centered in the canvas with appropriate padding)
 */
export function calculatePieceBounds(
  dims: FurnitureDimensions,
  viewType: 'plant' | 'frontal' | 'lateral',
  scale: number,
  svgWidth: number = CANVAS.defaultWidth,
  svgHeight: number = CANVAS.defaultHeight
): { x: number; y: number; width: number; height: number } {
  let widthCm: number;
  let heightCm: number;

  switch (viewType) {
    case 'plant':
      widthCm = dims.width;
      heightCm = dims.depth;
      break;
    case 'frontal':
      widthCm = dims.width;
      heightCm = dims.height;
      break;
    case 'lateral':
      widthCm = dims.depth;
      heightCm = dims.height;
      break;
  }

  const widthPx = widthCm * scale;
  const heightPx = heightCm * scale;

  // Center the piece in the canvas, offset slightly upward to leave room for scale bar
  const x = (svgWidth - widthPx) / 2;
  const y = (svgHeight - heightPx) / 2 - 5;

  return {
    x,
    y,
    width: widthPx,
    height: heightPx,
  };
}

/**
 * Get the scale display string (e.g., "1:10")
 */
export function getScaleDisplayString(scale: number): string {
  const scaleX = Math.round(1 / scale);
  return `1:${scaleX}`;
}
