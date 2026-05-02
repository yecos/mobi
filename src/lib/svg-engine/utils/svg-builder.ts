// ============================================================================
// SVG Engine - SVG Builder Utilities
// MOBI Furniture Plan Application
// ============================================================================

import type { Point } from '../types';
import {
  COLORS,
  LINE_WEIGHTS,
  DASH_PATTERNS,
  FONTS,
  DIMENSION_SPACING,
  SCALE_BAR,
} from '../styles';
import { midpoint, angle } from './geometry';

// ============================================================================
// SVG Element Helpers
// ============================================================================

/**
 * Escape special XML characters in a string
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build an SVG attribute string from a record
 */
function attrs(attributes: Record<string, string | number | undefined>): string {
  return Object.entries(attributes)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
}

/**
 * Create an SVG rectangle element
 */
export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    strokeDasharray?: string;
    rx?: number;
    ry?: number;
  } = {}
): string {
  const {
    stroke = COLORS.outline,
    strokeWidth = LINE_WEIGHTS.outline,
    fill = 'none',
    strokeDasharray,
    rx,
    ry,
  } = options;

  const attributes: Record<string, string | number | undefined> = {
    x: x.toFixed(2),
    y: y.toFixed(2),
    width: width.toFixed(2),
    height: height.toFixed(2),
    stroke,
    'stroke-width': strokeWidth,
    fill,
  };

  if (strokeDasharray) attributes['stroke-dasharray'] = strokeDasharray;
  if (rx !== undefined) attributes.rx = rx.toFixed(2);
  if (ry !== undefined) attributes.ry = ry.toFixed(2);

  return `<rect ${attrs(attributes)} />`;
}

/**
 * Create an SVG line element
 */
export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  } = {}
): string {
  const {
    stroke = COLORS.outline,
    strokeWidth = LINE_WEIGHTS.outline,
    strokeDasharray,
  } = options;

  const attributes: Record<string, string | number | undefined> = {
    x1: x1.toFixed(2),
    y1: y1.toFixed(2),
    x2: x2.toFixed(2),
    y2: y2.toFixed(2),
    stroke,
    'stroke-width': strokeWidth,
  };

  if (strokeDasharray) attributes['stroke-dasharray'] = strokeDasharray;

  return `<line ${attrs(attributes)} />`;
}

/**
 * Create an SVG circle element
 */
export function circle(
  cx: number,
  cy: number,
  r: number,
  options: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    strokeDasharray?: string;
  } = {}
): string {
  const {
    stroke = COLORS.outline,
    strokeWidth = LINE_WEIGHTS.outline,
    fill = 'none',
    strokeDasharray,
  } = options;

  const attributes: Record<string, string | number | undefined> = {
    cx: cx.toFixed(2),
    cy: cy.toFixed(2),
    r: Math.max(0.5, r).toFixed(2),
    stroke,
    'stroke-width': strokeWidth,
    fill,
  };

  if (strokeDasharray) attributes['stroke-dasharray'] = strokeDasharray;

  return `<circle ${attrs(attributes)} />`;
}

/**
 * Create an SVG arc path segment
 */
export function arc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  options: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    strokeDasharray?: string;
  } = {}
): string {
  const {
    stroke = COLORS.outline,
    strokeWidth = LINE_WEIGHTS.outline,
    fill = 'none',
    strokeDasharray,
  } = options;

  const startX = cx + r * Math.cos(startAngle);
  const startY = cy + r * Math.sin(startAngle);
  const endX = cx + r * Math.cos(endAngle);
  const endY = cy + r * Math.sin(endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;

  const d = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} ${sweepFlag} ${endX.toFixed(2)} ${endY.toFixed(2)}`;

  const attributes: Record<string, string | number | undefined> = {
    d,
    stroke,
    'stroke-width': strokeWidth,
    fill,
  };

  if (strokeDasharray) attributes['stroke-dasharray'] = strokeDasharray;

  return `<path ${attrs(attributes)} />`;
}

/**
 * Create an SVG path element from a path data string
 */
export function path(
  d: string,
  options: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    strokeDasharray?: string;
  } = {}
): string {
  const {
    stroke = COLORS.outline,
    strokeWidth = LINE_WEIGHTS.outline,
    fill = 'none',
    strokeDasharray,
  } = options;

  const attributes: Record<string, string | number | undefined> = {
    d,
    stroke,
    'stroke-width': strokeWidth,
    fill,
  };

  if (strokeDasharray) attributes['stroke-dasharray'] = strokeDasharray;

  return `<path ${attrs(attributes)} />`;
}

/**
 * Create an SVG polygon element
 */
export function polygon(
  points: Point[],
  options: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
  } = {}
): string {
  const {
    stroke = COLORS.outline,
    strokeWidth = LINE_WEIGHTS.outline,
    fill = 'none',
  } = options;

  const pointsStr = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  return `<polygon points="${pointsStr}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
}

/**
 * Create an SVG text element
 */
export function text(
  x: number,
  y: number,
  content: string,
  options: {
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    textAnchor?: string;
    fontWeight?: string;
    transform?: string;
  } = {}
): string {
  const {
    fontSize = FONTS.dimensionTextSize,
    fontFamily = FONTS.family,
    fill = COLORS.dimensionText,
    textAnchor = 'middle',
    fontWeight = 'normal',
    transform,
  } = options;

  const escaped = escapeXml(content);
  const transformAttr = transform ? ` transform="${transform}"` : '';

  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}" text-anchor="${textAnchor}" font-weight="${fontWeight}"${transformAttr}>${escaped}</text>`;
}

// ============================================================================
// Dimension Annotation Helpers
// ============================================================================

/**
 * Create an arrowhead polygon at a given position
 */
export function arrowhead(
  tip: Point,
  direction: number,
  options: {
    length?: number;
    width?: number;
    filled?: boolean;
  } = {}
): string {
  const {
    length = DIMENSION_SPACING.arrowLength,
    width = DIMENSION_SPACING.arrowWidth,
    filled = true,
  } = options;

  const cos = Math.cos(direction);
  const sin = Math.sin(direction);

  // Tip point
  const tipX = tip.x;
  const tipY = tip.y;

  // Base center (behind the tip)
  const baseX = tipX - cos * length;
  const baseY = tipY - sin * length;

  // Perpendicular offset for the base corners
  const perpCos = Math.cos(direction + Math.PI / 2);
  const perpSin = Math.sin(direction + Math.PI / 2);

  const leftX = baseX + perpCos * width;
  const leftY = baseY + perpSin * width;
  const rightX = baseX - perpCos * width;
  const rightY = baseY - perpSin * width;

  const points: Point[] = [
    { x: tipX, y: tipY },
    { x: leftX, y: leftY },
    { x: rightX, y: rightY },
  ];

  return polygon(points, {
    stroke: COLORS.dimension,
    strokeWidth: 0.5,
    fill: filled ? COLORS.dimension : 'none',
  });
}

/**
 * Create an extension line from a point on the furniture edge to the dimension line
 */
export function extensionLine(
  from: Point,
  to: Point,
  options: {
    overshoot?: number;
  } = {}
): string {
  const { overshoot = DIMENSION_SPACING.extensionOvershoot } = options;

  // Extend the line slightly past the 'to' point
  const dir = angle(from, to);
  const extendedX = to.x + Math.cos(dir) * overshoot;
  const extendedY = to.y + Math.sin(dir) * overshoot;

  return line(from.x, from.y, extendedX, extendedY, {
    stroke: COLORS.extensionLine,
    strokeWidth: LINE_WEIGHTS.extension,
  });
}

/**
 * Create a complete dimension annotation with extension lines, arrows, and centered text
 */
export function dimensionLine(
  start: Point,
  end: Point,
  value: string,
  options: {
    offset?: number;
    side?: 'top' | 'bottom' | 'left' | 'right';
    unit?: 'cm' | 'in';
    fontSize?: number;
  } = {}
): string {
  const {
    offset = DIMENSION_SPACING.dimensionOffset,
    side = 'top',
    fontSize = FONTS.dimensionTextSize,
  } = options;

  const parts: string[] = [];

  // Calculate dimension line position based on side/offset
  let dimStart: Point;
  let dimEnd: Point;
  let extStartStart: Point;
  let extStartEnd: Point;
  let extEndStart: Point;
  let extEndEnd: Point;
  let textPos: Point;
  let arrowDirStart: number;
  let arrowDirEnd: number;

  if (side === 'top') {
    // Horizontal dimension above the piece
    dimStart = { x: start.x, y: start.y - offset };
    dimEnd = { x: end.x, y: start.y - offset };
    extStartStart = start;
    extStartEnd = dimStart;
    extEndStart = { x: end.x, y: start.y };
    extEndEnd = dimEnd;
    textPos = midpoint(dimStart, dimEnd);
    textPos.y -= DIMENSION_SPACING.textPadding / 2;
    arrowDirStart = 0;  // Points right
    arrowDirEnd = Math.PI; // Points left
  } else if (side === 'bottom') {
    // Horizontal dimension below the piece
    dimStart = { x: start.x, y: start.y + offset };
    dimEnd = { x: end.x, y: start.y + offset };
    extStartStart = start;
    extStartEnd = dimStart;
    extEndStart = { x: end.x, y: start.y };
    extEndEnd = dimEnd;
    textPos = midpoint(dimStart, dimEnd);
    textPos.y += fontSize + DIMENSION_SPACING.textPadding / 2;
    arrowDirStart = 0;
    arrowDirEnd = Math.PI;
  } else if (side === 'left') {
    // Vertical dimension to the left of the piece
    dimStart = { x: start.x - offset, y: start.y };
    dimEnd = { x: start.x - offset, y: end.y };
    extStartStart = start;
    extStartEnd = dimStart;
    extEndStart = { x: start.x, y: end.y };
    extEndEnd = dimEnd;
    textPos = midpoint(dimStart, dimEnd);
    textPos.x -= DIMENSION_SPACING.textPadding + fontSize / 2;
    arrowDirStart = Math.PI / 2;   // Points down
    arrowDirEnd = -Math.PI / 2;    // Points up
  } else {
    // Vertical dimension to the right (side === 'right')
    dimStart = { x: start.x + offset, y: start.y };
    dimEnd = { x: start.x + offset, y: end.y };
    extStartStart = start;
    extStartEnd = dimStart;
    extEndStart = { x: start.x, y: end.y };
    extEndEnd = dimEnd;
    textPos = midpoint(dimStart, dimEnd);
    textPos.x += DIMENSION_SPACING.textPadding + fontSize / 2;
    arrowDirStart = Math.PI / 2;   // Points down
    arrowDirEnd = -Math.PI / 2;    // Points up
  }

  // Extension lines
  parts.push(extensionLine(extStartStart, extStartEnd));
  parts.push(extensionLine(extEndStart, extEndEnd));

  // Dimension line (between arrowheads)
  parts.push(line(dimStart.x, dimStart.y, dimEnd.x, dimEnd.y, {
    stroke: COLORS.dimension,
    strokeWidth: LINE_WEIGHTS.dimension,
  }));

  // Arrowheads
  parts.push(arrowhead(dimStart, arrowDirStart));
  parts.push(arrowhead(dimEnd, arrowDirEnd));

  // Dimension text
  const isVertical = side === 'left' || side === 'right';
  const textTransform = isVertical
    ? `rotate(-90, ${textPos.x.toFixed(2)}, ${textPos.y.toFixed(2)})`
    : undefined;

  parts.push(text(textPos.x, textPos.y, value, {
    fontSize,
    fill: COLORS.dimensionText,
    transform: textTransform,
  }));

  return parts.join('\n');
}

// ============================================================================
// Scale Bar
// ============================================================================

/**
 * Create a scale reference bar with markings
 */
export function scaleBar(
  x: number,
  y: number,
  barLengthCm: number,
  scale: number,
  options: {
    unit?: 'cm' | 'in';
    showDivisions?: boolean;
  } = {}
): string {
  const { unit = 'cm', showDivisions = true } = options;
  const parts: string[] = [];

  const barLengthPx = barLengthCm * scale;
  const barHeight = SCALE_BAR.height;

  // Main bar outline
  parts.push(rect(x, y, barLengthPx, barHeight, {
    stroke: COLORS.scaleBar,
    strokeWidth: LINE_WEIGHTS.scaleBar,
    fill: COLORS.scaleBarFill,
  }));

  // Alternating fill sections every 10cm equivalent
  if (showDivisions) {
    const stepCm = 10;
    const stepPx = stepCm * scale;
    const numDivisions = Math.floor(barLengthCm / stepCm);

    for (let i = 0; i < numDivisions; i++) {
      if (i % 2 === 0) {
        const divX = x + i * stepPx;
        const divWidth = Math.min(stepPx, x + barLengthPx - divX);
        if (divWidth > 0) {
          parts.push(rect(divX, y, divWidth, barHeight, {
            stroke: 'none',
            fill: COLORS.scaleBar,
            strokeWidth: 0,
          }));
        }
      }
    }

    // Division tick marks
    for (let i = 0; i <= numDivisions; i++) {
      const tickX = x + i * stepPx;
      if (tickX <= x + barLengthPx + 0.5) {
        parts.push(line(tickX, y + barHeight, tickX, y + barHeight + SCALE_BAR.divisionHeight, {
          stroke: COLORS.scaleBar,
          strokeWidth: LINE_WEIGHTS.scaleBar,
        }));

        // Label for each division
        const labelCm = i * stepCm;
        const labelText = unit === 'cm' ? `${labelCm}` : `${Math.round(cmToInchesVal(labelCm))}"`;
        parts.push(text(tickX, y + barHeight + SCALE_BAR.divisionHeight + SCALE_BAR.textOffset, labelText, {
          fontSize: FONTS.scaleBarTextSize,
          fill: COLORS.scaleBar,
        }));
      }
    }
  }

  // Scale label (e.g., "Escala 1:10")
  const scaleX = Math.round(1 / scale);
  const actualScaleLabel = `Escala 1:${scaleX}`;
  parts.push(text(
    x + barLengthPx / 2,
    y - SCALE_BAR.textOffset / 2,
    actualScaleLabel,
    {
      fontSize: FONTS.scaleBarTextSize,
      fill: COLORS.scaleBar,
    }
  ));

  return parts.join('\n');
}

/**
 * Helper: convert cm to inches (for scale bar labels)
 */
function cmToInchesVal(cm: number): number {
  return cm / 2.54;
}

// ============================================================================
// Grouping and Wrapping
// ============================================================================

/**
 * Wrap SVG content in a group element with optional transform
 */
export function group(content: string, options: {
  transform?: string;
  id?: string;
  className?: string;
} = {}): string {
  const { transform, id, className } = options;
  const attrsList: string[] = [];
  if (transform) attrsList.push(`transform="${transform}"`);
  if (id) attrsList.push(`id="${id}"`);
  if (className) attrsList.push(`class="${className}"`);
  const attrStr = attrsList.length > 0 ? ' ' + attrsList.join(' ') : '';
  return `<g${attrStr}>\n${content}\n</g>`;
}

/**
 * Create the complete SVG wrapper element
 */
export function svg(
  content: string,
  options: {
    viewBox?: string;
    width?: number;
    height?: number;
    xmlns?: string;
  } = {}
): string {
  const {
    viewBox,
    width = 400,
    height = 400,
    xmlns = 'http://www.w3.org/2000/svg',
  } = options;

  const vbStr = viewBox || `0 0 ${width} ${height}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${xmlns}" viewBox="${vbStr}" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${COLORS.background}" />
${content}
</svg>`;
}

/**
 * Create a view label (PLANTA, FRONTAL, LATERAL)
 */
export function viewLabel(
  x: number,
  y: number,
  label: string,
  options: {
    fontSize?: number;
  } = {}
): string {
  const { fontSize = FONTS.viewLabelSize } = options;
  return text(x, y, label, {
    fontSize,
    fill: COLORS.viewLabel,
    fontWeight: 'bold',
  });
}
