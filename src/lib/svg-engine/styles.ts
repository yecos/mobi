// ============================================================================
// SVG Engine - Style Constants
// MOBI Furniture Plan Application
// ============================================================================

/** Line weights in pixels */
export const LINE_WEIGHTS = {
  outline: 2,
  internal: 1,
  hidden: 0.5,
  dimension: 0.75,
  extension: 0.5,
  scaleBar: 0.75,
  label: 0,
} as const;

/** Color palette for SVG elements */
export const COLORS = {
  outline: '#1a1a1a',
  internal: '#333333',
  hidden: '#666666',
  dimension: '#000000',
  background: '#ffffff',
  dimensionText: '#000000',
  labelText: '#1a1a1a',
  scaleBar: '#000000',
  scaleBarFill: '#ffffff',
  viewLabel: '#1a1a1a',
  extensionLine: '#000000',
} as const;

/** Dash patterns */
export const DASH_PATTERNS = {
  hidden: '8,4',
  extension: '4,2',
  center: '12,4,4,4',
} as const;

/** Font settings */
export const FONTS = {
  family: 'sans-serif',
  dimensionTextSize: 10,
  labelSize: 12,
  viewLabelSize: 14,
  scaleBarTextSize: 8,
} as const;

/** Dimension annotation spacing */
export const DIMENSION_SPACING = {
  extensionGap: 2,          // Gap between piece edge and extension line start
  extensionOvershoot: 3,    // Extension line extends past dimension line
  arrowLength: 6,           // Arrowhead length
  arrowWidth: 2,            // Arrowhead half-width
  textPadding: 4,           // Padding around dimension text
  dimensionOffset: 20,      // Default offset from piece to dimension line
  secondDimensionOffset: 38, // Offset for second dimension line
} as const;

/** Scale bar settings */
export const SCALE_BAR = {
  height: 6,
  divisionHeight: 4,
  textOffset: 10,
  leftMargin: 10,
  bottomMargin: 15,
} as const;

/** SVG canvas defaults */
export const CANVAS = {
  defaultWidth: 400,
  defaultHeight: 400,
  padding: 50,               // Padding around furniture for dimensions
  minPadding: 30,
  furnitureAreaRatio: 0.65,   // Furniture should occupy ~65% of canvas area
} as const;

/** Standard architectural scales (1:X) */
export const STANDARD_SCALES = [5, 10, 15, 20, 25, 50, 75, 100] as const;

/** Corner radius for rounded shapes */
export const CORNER_RADIUS = {
  small: 3,
  medium: 8,
  large: 15,
  extraLarge: 25,
} as const;

/** Furniture type defaults (in cm) */
export const FURNITURE_DEFAULTS = {
  chair: {
    width: 50,
    height: 85,
    depth: 52,
    seatHeight: 45,
    backrestHeight: 40,
    armrestHeight: 65,
    legHeight: 45,
  },
  sofa: {
    width: 200,
    height: 90,
    depth: 90,
    seatHeight: 43,
    backrestHeight: 45,
    armrestHeight: 60,
    legHeight: 15,
  },
  table: {
    width: 120,
    height: 75,
    depth: 70,
    topThickness: 3,
    legHeight: 72,
  },
  bed: {
    width: 150,
    height: 100,
    depth: 200,
    mattressThickness: 25,
    backrestHeight: 50,
    legHeight: 25,
  },
} as const;
