// ============================================================================
// SVG Engine - Lateral View (Side Elevation) Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, SVGViewConfig, GeneratedSVGView, Point } from '../types';
import { CANVAS, FONTS, DIMENSION_SPACING } from '../styles';
import { calculateScale, calculatePieceBounds, calculateScaleBarLength } from '../scale';
import { svg, dimensionLine, scaleBar, viewLabel, group } from '../utils/svg-builder';
import { formatDimension } from '../utils/geometry';
import { chairLateralView } from '../furniture/chair';
import { sofaLateralView } from '../furniture/sofa';
import { tableLateralView } from '../furniture/table';
import { bedLateralView } from '../furniture/bed';
import { genericLateralView } from '../furniture/generic';

/**
 * Generate the complete LATERAL (side elevation) view SVG
 */
export function generateLateralView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  furnitureType: string,
  config: SVGViewConfig
): GeneratedSVGView {
  const { width, height, scale, showDimensions, unit, referenceBar, padding } = config;

  // Calculate piece bounds
  const bounds = calculatePieceBounds(dims, 'lateral', scale, width, height);
  const origin: Point = { x: bounds.x, y: bounds.y };

  // Generate furniture geometry
  const furnitureSvg = getFurnitureLateralGeometry(dims, shape, furnitureType, scale, origin);

  // Generate dimension annotations
  let dimensionsSvg = '';
  if (showDimensions) {
    dimensionsSvg = generateLateralDimensions(dims, bounds, scale, unit, furnitureType);
  }

  // View label
  const label = viewLabel(width / 2, 18, 'LATERAL', { fontSize: FONTS.viewLabelSize });

  // Scale bar
  let scaleBarSvg = '';
  if (referenceBar) {
    const barLengthCm = calculateScaleBarLength(scale, width - padding * 2);
    scaleBarSvg = scaleBar(
      padding,
      height - CANVAS.padding + 5,
      barLengthCm,
      scale,
      { unit }
    );
  }

  // Compose full SVG
  const content = group([label, furnitureSvg, dimensionsSvg, scaleBarSvg].join('\n'), { id: 'lateral-view' });
  const svgContent = svg(content, { viewBox: `0 0 ${width} ${height}`, width, height });

  const barLengthCm = calculateScaleBarLength(scale, width - padding * 2);

  return {
    svgContent,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    viewType: 'lateral',
    scale,
    scaleBarLength: barLengthCm,
  };
}

/**
 * Select and generate the appropriate furniture lateral view geometry
 */
function getFurnitureLateralGeometry(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  furnitureType: string,
  scale: number,
  origin: Point
): string {
  switch (furnitureType) {
    case 'chair':
      return chairLateralView(dims, shape, scale, origin);
    case 'sofa':
      return sofaLateralView(dims, shape, scale, origin);
    case 'table':
      return tableLateralView(dims, shape, scale, origin);
    case 'bed':
      return bedLateralView(dims, shape, scale, origin);
    default:
      return genericLateralView(dims, shape, scale, origin);
  }
}

/**
 * Generate dimension annotations for the lateral view
 */
function generateLateralDimensions(
  dims: FurnitureDimensions,
  bounds: { x: number; y: number; width: number; height: number },
  scale: number,
  unit: 'cm' | 'in',
  furnitureType: string
): string {
  const parts: string[] = [];

  // Depth dimension (top)
  const depthStart: Point = { x: bounds.x, y: bounds.y };
  const depthEnd: Point = { x: bounds.x + bounds.width, y: bounds.y };
  parts.push(dimensionLine(depthStart, depthEnd, formatDimension(dims.depth, unit), {
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'top',
    unit,
  }));

  // Total height dimension (right side)
  const heightStart: Point = { x: bounds.x + bounds.width, y: bounds.y };
  const heightEnd: Point = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
  parts.push(dimensionLine(heightStart, heightEnd, formatDimension(dims.height, unit), {
    offset: DIMENSION_SPACING.dimensionOffset,
    side: 'right',
    unit,
  }));

  // Seat height (left side) - for chairs and sofas
  if ((furnitureType === 'chair' || furnitureType === 'sofa') && dims.seatHeight && dims.seatHeight > 0) {
    const seatH = dims.seatHeight * scale;
    const seatStart: Point = { x: bounds.x, y: bounds.y + bounds.height };
    const seatEnd: Point = { x: bounds.x, y: bounds.y + bounds.height - seatH };
    parts.push(dimensionLine(seatStart, seatEnd, formatDimension(dims.seatHeight, unit), {
      offset: DIMENSION_SPACING.secondDimensionOffset,
      side: 'left',
      unit,
    }));
  }

  // Mattress thickness for beds (left side)
  if (furnitureType === 'bed' && dims.mattressThickness && dims.mattressThickness > 0) {
    const mattThick = dims.mattressThickness * scale;
    const mattStart: Point = { x: bounds.x, y: bounds.y + bounds.height - dims.legHeight * scale - mattThick };
    const mattEnd: Point = { x: bounds.x, y: bounds.y + bounds.height - dims.legHeight * scale };
    parts.push(dimensionLine(mattStart, mattEnd, formatDimension(dims.mattressThickness, unit), {
      offset: DIMENSION_SPACING.secondDimensionOffset,
      side: 'left',
      unit,
    }));
  }

  return group(parts.join('\n'), { id: 'lateral-dimensions' });
}
