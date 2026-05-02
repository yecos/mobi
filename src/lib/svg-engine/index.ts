// ============================================================================
// SVG Engine - Public API / Index
// MOBI Furniture Plan Application
// ============================================================================

// Main entry points
export { generateFurnitureDrawing, generateDrawingFromFurnitureData, generateCombinedDrawing } from './renderer';

// Types
export type {
  FurnitureDimensions,
  ShapeProfile,
  DimensionAnnotation,
  SVGViewConfig,
  GeneratedSVGView,
  FurnitureDrawingResult,
  Point,
  GeometryElement,
  ViewGeometry,
  DimensionValue,
} from './types';

// Style constants (for advanced usage)
export {
  LINE_WEIGHTS,
  COLORS,
  DASH_PATTERNS,
  FONTS,
  DIMENSION_SPACING,
  SCALE_BAR,
  CANVAS,
  STANDARD_SCALES,
  CORNER_RADIUS,
  FURNITURE_DEFAULTS,
} from './styles';

// Utilities (for advanced usage)
export {
  rect,
  line,
  circle,
  arc,
  path,
  polygon,
  text,
  arrowhead,
  extensionLine,
  dimensionLine,
  scaleBar,
  group,
  svg,
  viewLabel,
} from './utils/svg-builder';

export {
  distance,
  angle,
  midpoint,
  offsetPoint,
  scalePoint,
  rotatePoint,
  lerp,
  boundingBox,
  cmToPixels,
  feetInchesToCm,
  cmToInches,
  cmToFeetInchesStr,
  formatDimension,
  distributePositions,
  rectCorners,
  rectCenter,
  clamp,
} from './utils/geometry';

// Scale utilities
export {
  calculateScale,
  calculateViewConfig,
  calculateScaleBarLength,
  calculatePieceBounds,
  getScaleDisplayString,
} from './scale';

// Dimension utilities
export {
  plantViewDimensions,
  frontalViewDimensions,
  lateralViewDimensions,
} from './dimensions';
