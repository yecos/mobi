// ============================================================================
// SVG Engine - Frontal View (Front Elevation) Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, SVGViewConfig, GeneratedSVGView, Point } from '../types';
import { CANVAS, FONTS, DIMENSION_SPACING } from '../styles';
import { calculateScale, calculatePieceBounds, calculateScaleBarLength } from '../scale';
import { svg, dimensionLine, scaleBar, viewLabel, group } from '../utils/svg-builder';
import { formatDimension } from '../utils/geometry';
import { chairFrontalView } from '../furniture/chair';
import { sofaFrontalView } from '../furniture/sofa';
import { tableFrontalView } from '../furniture/table';
import { bedFrontalView } from '../furniture/bed';
import { genericFrontalView } from '../furniture/generic';

/**
 * Generate the complete FRONTAL (front elevation) view SVG
 */
export function generateFrontalView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  furnitureType: string,
  config: SVGViewConfig
): GeneratedSVGView {
  const { width, height, scale, showDimensions, unit, referenceBar, padding } = config;

  // Calculate piece bounds
  const bounds = calculatePieceBounds(dims, 'frontal', scale, width, height);
  const origin: Point = { x: bounds.x, y: bounds.y };

  // Generate furniture geometry
  const furnitureSvg = getFurnitureFrontalGeometry(dims, shape, furnitureType, scale, origin);

  // Generate dimension annotations
  let dimensionsSvg = '';
  if (showDimensions) {
    dimensionsSvg = generateFrontalDimensions(dims, bounds, scale, unit, furnitureType);
  }

  // View label
  const label = viewLabel(width / 2, 18, 'FRONTAL', { fontSize: FONTS.viewLabelSize });

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
  const content = group([label, furnitureSvg, dimensionsSvg, scaleBarSvg].join('\n'), { id: 'frontal-view' });
  const svgContent = svg(content, { viewBox: `0 0 ${width} ${height}`, width, height });

  const barLengthCm = calculateScaleBarLength(scale, width - padding * 2);

  return {
    svgContent,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    viewType: 'frontal',
    scale,
    scaleBarLength: barLengthCm,
  };
}

/**
 * Select and generate the appropriate furniture frontal view geometry
 */
function getFurnitureFrontalGeometry(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  furnitureType: string,
  scale: number,
  origin: Point
): string {
  switch (furnitureType) {
    case 'chair':
      return chairFrontalView(dims, shape, scale, origin);
    case 'sofa':
      return sofaFrontalView(dims, shape, scale, origin);
    case 'table':
      return tableFrontalView(dims, shape, scale, origin);
    case 'bed':
      return bedFrontalView(dims, shape, scale, origin);
    default:
      return genericFrontalView(dims, shape, scale, origin);
  }
}

/**
 * Generate dimension annotations for the frontal view
 */
function generateFrontalDimensions(
  dims: FurnitureDimensions,
  bounds: { x: number; y: number; width: number; height: number },
  scale: number,
  unit: 'cm' | 'in',
  furnitureType: string
): string {
  const parts: string[] = [];

  // Width dimension (top)
  const widthStart: Point = { x: bounds.x, y: bounds.y };
  const widthEnd: Point = { x: bounds.x + bounds.width, y: bounds.y };
  parts.push(dimensionLine(widthStart, widthEnd, formatDimension(dims.width, unit), {
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

  // Seat height dimension (left side) - for chairs and sofas
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

  // Top thickness for tables
  if (furnitureType === 'table' && dims.topThickness && dims.topThickness > 0) {
    const topThick = dims.topThickness * scale;
    const topStart: Point = { x: bounds.x, y: bounds.y };
    const topEnd: Point = { x: bounds.x, y: bounds.y + topThick };
    parts.push(dimensionLine(topStart, topEnd, formatDimension(dims.topThickness, unit), {
      offset: DIMENSION_SPACING.secondDimensionOffset,
      side: 'left',
      unit,
    }));
  }

  return group(parts.join('\n'), { id: 'frontal-dimensions' });
}
