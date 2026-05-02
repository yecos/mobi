// ============================================================================
// SVG Engine - Plant View (Top-Down / Plan) Generator
// MOBI Furniture Plan Application
// ============================================================================

import type { FurnitureDimensions, ShapeProfile, SVGViewConfig, GeneratedSVGView, Point } from '../types';
import { CANVAS, FONTS } from '../styles';
import { calculateScale, calculatePieceBounds, calculateScaleBarLength } from '../scale';
import { plantViewDimensions } from '../dimensions';
import { svg, dimensionLine, scaleBar, viewLabel, group } from '../utils/svg-builder';
import { formatDimension } from '../utils/geometry';
import { chairPlantView } from '../furniture/chair';
import { sofaPlantView } from '../furniture/sofa';
import { tablePlantView } from '../furniture/table';
import { bedPlantView } from '../furniture/bed';
import { genericPlantView } from '../furniture/generic';

/**
 * Generate the complete PLANT (top-down) view SVG
 */
export function generatePlantView(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  furnitureType: string,
  config: SVGViewConfig
): GeneratedSVGView {
  const { width, height, scale, showDimensions, unit, referenceBar, padding } = config;

  // Calculate piece bounds (centered in canvas)
  const bounds = calculatePieceBounds(dims, 'plant', scale, width, height);
  const origin: Point = { x: bounds.x, y: bounds.y };

  // Generate furniture geometry
  const furnitureSvg = getFurniturePlantGeometry(dims, shape, furnitureType, scale, origin);

  // Generate dimension annotations
  let dimensionsSvg = '';
  if (showDimensions) {
    dimensionsSvg = generatePlantDimensions(dims, bounds, scale, unit);
  }

  // View label
  const label = viewLabel(width / 2, 18, 'PLANTA', { fontSize: FONTS.viewLabelSize });

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
  const content = group([label, furnitureSvg, dimensionsSvg, scaleBarSvg].join('\n'), { id: 'plant-view' });
  const svgContent = svg(content, { viewBox: `0 0 ${width} ${height}`, width, height });

  const barLengthCm = calculateScaleBarLength(scale, width - padding * 2);

  return {
    svgContent,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    viewType: 'plant',
    scale,
    scaleBarLength: barLengthCm,
  };
}

/**
 * Select and generate the appropriate furniture plant view geometry
 */
function getFurniturePlantGeometry(
  dims: FurnitureDimensions,
  shape: ShapeProfile,
  furnitureType: string,
  scale: number,
  origin: Point
): string {
  switch (furnitureType) {
    case 'chair':
      return chairPlantView(dims, shape, scale, origin);
    case 'sofa':
      return sofaPlantView(dims, shape, scale, origin);
    case 'table':
      return tablePlantView(dims, shape, scale, origin);
    case 'bed':
      return bedPlantView(dims, shape, scale, origin);
    default:
      return genericPlantView(dims, shape, scale, origin);
  }
}

/**
 * Generate dimension annotations for the plant view
 */
function generatePlantDimensions(
  dims: FurnitureDimensions,
  bounds: { x: number; y: number; width: number; height: number },
  scale: number,
  unit: 'cm' | 'in'
): string {
  const parts: string[] = [];

  // Width dimension (top side)
  const widthStart: Point = { x: bounds.x, y: bounds.y };
  const widthEnd: Point = { x: bounds.x + bounds.width, y: bounds.y };
  parts.push(dimensionLine(widthStart, widthEnd, formatDimension(dims.width, unit), {
    offset: 20,
    side: 'top',
    unit,
  }));

  // Depth dimension (right side)
  const depthStart: Point = { x: bounds.x + bounds.width, y: bounds.y };
  const depthEnd: Point = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
  parts.push(dimensionLine(depthStart, depthEnd, formatDimension(dims.depth, unit), {
    offset: 20,
    side: 'right',
    unit,
  }));

  return group(parts.join('\n'), { id: 'plant-dimensions' });
}
