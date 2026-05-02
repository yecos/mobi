// ============================================================================
// SVG Engine - Generic Furniture Geometry Generator (Fallback)
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, Point } from '../types';
import { rect, line, group } from '../utils/svg-builder';
import { cmToPixels } from '../utils/geometry';

/**
 * Generate generic rectangular box geometry for PLANT (top-down) view
 * Fallback: Simple rectangular box with width × depth
 */
export function genericPlantView(
  dims: FurnitureDimensions,
  _shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const d = cmToPixels(dims.depth, scale);

  // Main outline
  parts.push(rect(x, y, w, d, {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Cross-hair center mark
  const cx = x + w / 2;
  const cy = y + d / 2;
  const markLen = cmToPixels(3, scale);
  parts.push(line(cx - markLen, cy, cx + markLen, cy, {
    stroke: '#333333', strokeWidth: 0.5, strokeDasharray: '4,2',
  }));
  parts.push(line(cx, cy - markLen, cx, cy + markLen, {
    stroke: '#333333', strokeWidth: 0.5, strokeDasharray: '4,2',
  }));

  return group(parts.join('\n'));
}

/**
 * Generate generic rectangular box geometry for FRONTAL (front elevation) view
 * Fallback: Simple rectangular box with width × height
 */
export function genericFrontalView(
  dims: FurnitureDimensions,
  _shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const w = cmToPixels(dims.width, scale);
  const h = cmToPixels(dims.height, scale);

  // Main outline
  parts.push(rect(x, y, w, h, {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Diagonal cross to indicate generic/solid box
  parts.push(line(x, y, x + w, y + h, {
    stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
  }));
  parts.push(line(x + w, y, x, y + h, {
    stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
  }));

  return group(parts.join('\n'));
}

/**
 * Generate generic rectangular box geometry for LATERAL (side elevation) view
 * Fallback: Simple rectangular box with depth × height
 */
export function genericLateralView(
  dims: FurnitureDimensions,
  _shape: ShapeProfile,
  scale: number,
  origin: Point
): string {
  const parts: string[] = [];
  const { x, y } = origin;

  const d = cmToPixels(dims.depth, scale);
  const h = cmToPixels(dims.height, scale);

  // Main outline
  parts.push(rect(x, y, d, h, {
    stroke: '#1a1a1a', strokeWidth: 2, fill: 'none',
  }));

  // Diagonal cross
  parts.push(line(x, y, x + d, y + h, {
    stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
  }));
  parts.push(line(x + d, y, x, y + h, {
    stroke: '#666666', strokeWidth: 0.5, strokeDasharray: '8,4',
  }));

  return group(parts.join('\n'));
}
