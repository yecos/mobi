# MOBI — Motor SVG

> Documentación de referencia rápida — Arquitectura y API del motor de dibujos técnicos SVG.

## Visión General

El motor SVG de MOBI es un sistema de renderizado de dibujos técnicos ortográficos escrito completamente en TypeScript puro, sin dependencias externas de SVG, canvas ni librerías de visualización. Genera representaciones vectoriales precisas de mobiliario con cotas, líneas de extensión, flechas y barras de escala, siguiendo convenciones de dibujo arquitectónico.

## Punto de Entrada Principal

```typescript
import { generateFurnitureDrawing } from '@/lib/svg-engine';

const result = generateFurnitureDrawing(
  furnitureType,  // string: 'chair' | 'sofa' | 'table' | 'bed' | 'generic'
  dimensions,     // FurnitureDimensions (en cm)
  shapeProfile,   // ShapeProfile
  options         // { unit?: 'cm' | 'in', showDimensions?: boolean }
);
```

### Funciones de Conveniencia

| Función                          | Descripción                                                        |
|----------------------------------|--------------------------------------------------------------------|
| `generateFurnitureDrawing()`     | Punto de entrada principal. Genera las 3 vistas.                   |
| `generateDrawingFromFurnitureData()` | Convierte `{ feet, inches }` a cm automáticamente antes de llamar al motor. |
| `generateCombinedDrawing()`      | Genera un SVG combinado con las 3 vistas en layout (frontal arriba, planta y lateral abajo). |

### Tipo de Resultado

```typescript
interface FurnitureDrawingResult {
  plantView: GeneratedSVGView;    // Vista de planta (top-down)
  frontalView: GeneratedSVGView;  // Vista frontal
  lateralView: GeneratedSVGView;  // Vista lateral
  dimensions: FurnitureDimensions;
  shapeProfile: ShapeProfile;
  furnitureType: string;
  scale: number;
}

interface GeneratedSVGView {
  svgContent: string;  // SVG completo como string
  viewType: 'plant' | 'frontal' | 'lateral';
  width: number;
  height: number;
}
```

## Tipos de Mueble

El motor determina automáticamente el tipo de mueble a partir del string de categoría. Soporta 5 tipos, cada uno con geometría y valores por defecto específicos:

| Tipo       | Categorías reconocidas                    | Defaults (ancho × alto × prof. cm) |
|------------|-------------------------------------------|-------------------------------------|
| `chair`    | chair, silla                              | 50 × 85 × 52                       |
| `sofa`     | sofa, sofá, couch                         | 200 × 90 × 90                      |
| `table`    | table, mesa, desk                         | 120 × 75 × 70                      |
| `bed`      | bed, cama                                 | 150 × 100 × 200                    |
| `generic`  | Cualquier otro valor                      | 60 × 80 × 60                       |

### Lógica de Determinación

```typescript
function determineFurnitureType(category: string): string {
  const normalized = (category || '').toLowerCase().trim();
  if (normalized.includes('chair') || normalized.includes('silla')) return 'chair';
  if (normalized.includes('sofa') || normalized.includes('sofá') || normalized.includes('couch')) return 'sofa';
  if (normalized.includes('table') || normalized.includes('mesa') || normalized.includes('desk')) return 'table';
  if (normalized.includes('bed') || normalized.includes('cama')) return 'bed';
  return 'generic';
}
```

Cada tipo tiene su propio módulo de geometría en `src/lib/svg-engine/furniture/`:
- `chair.ts` — Asiento, respaldo, patas, reposabrazos
- `sofa.ts` — Cuerpo con cojines, respaldo, reposabrazos, patas bajas
- `table.ts` — Superficie plana, patas
- `bed.ts` — Marco, colchón, cabecera
- `generic.ts` — Caja rectangular con patas opcionales

## Vistas Ortográficas

### Vista de Planta (`plant-view.ts`)

Vista superior (top-down). Muestra el ancho y la profundidad del mueble. Elementos típicos:
- Contorno del cuerpo visto desde arriba
- Posición de las patas (puntos o círculos)
- Cojines y subdivisiones del asiento
- Líneas de cotas horizontales (ancho) y verticales (profundidad)

### Vista Frontal (`frontal-view.ts`)

Vista de frente. Muestra la altura y el ancho del mueble. Elementos típicos:
- Perfil del cuerpo, respaldo y reposabrazos
- Patas con su altura correspondiente
- Detalles del asiento (cojines, curvas)
- Líneas de cotas horizontales (ancho) y verticales (altura)

### Vista Lateral (`lateral-view.ts`)

Vista lateral derecha. Muestra la altura y la profundidad. Elementos típicos:
- Perfil lateral del cuerpo
- Respaldo visto de perfil
- Profundidad del asiento
- Líneas de cotas horizontales (profundidad) y verticales (altura)

## Constantes de Estilo

Definidas en `src/lib/svg-engine/styles.ts`:

### Pesos de Línea

```typescript
export const LINE_WEIGHTS = {
  outline: 2,       // Contorno principal
  internal: 1,      // Líneas internas
  hidden: 0.5,      // Líneas ocultas
  dimension: 0.75,  // Líneas de cota
  extension: 0.5,   // Líneas de extensión
  scaleBar: 0.75,   // Barra de escala
  label: 0,         // Etiquetas (sin trazo)
};
```

### Colores

```typescript
export const COLORS = {
  outline: '#1a1a1a',        // Contorno
  internal: '#333333',       // Internas
  hidden: '#666666',         // Ocultas (discontinuas)
  dimension: '#000000',      // Cotas
  background: '#ffffff',     // Fondo
  dimensionText: '#000000',  // Texto de cotas
  labelText: '#1a1a1a',      // Etiquetas
  scaleBar: '#000000',       // Barra de escala
  viewLabel: '#1a1a1a',      // Etiqueta de vista
};
```

### Patrones de Discontinuidad

```typescript
export const DASH_PATTERNS = {
  hidden: '8,4',           // Líneas ocultas
  extension: '4,2',        // Líneas de extensión
  center: '12,4,4,4',      // Líneas de centro
};
```

### Fuentes

```typescript
export const FONTS = {
  family: 'sans-serif',
  dimensionTextSize: 10,
  labelSize: 12,
  viewLabelSize: 14,
  scaleBarTextSize: 8,
};
```

### Espaciado de Cotas

```typescript
export const DIMENSION_SPACING = {
  extensionGap: 2,               // Gap entre pieza e inicio de línea de extensión
  extensionOvershoot: 3,         // Extensión pasa la línea de cota
  arrowLength: 6,                // Longitud de flecha
  arrowWidth: 2,                 // Ancho medio de flecha
  textPadding: 4,                // Padding alrededor del texto
  dimensionOffset: 20,           // Offset pieza → línea de cota
  secondDimensionOffset: 38,     // Offset para segunda cota
};
```

### Lienzo y Escalas

```typescript
export const CANVAS = {
  defaultWidth: 400,
  defaultHeight: 400,
  padding: 50,                    // Padding para cotas
  furnitureAreaRatio: 0.65,       // El mueble ocupa ~65% del lienzo
};

export const STANDARD_SCALES = [5, 10, 15, 20, 25, 50, 75, 100]; // 1:X
```

### Radios de Esquina

```typescript
export const CORNER_RADIUS = {
  small: 3,       // Esquinas ligeramente redondeadas
  medium: 8,      // Esquinas moderadas
  large: 15,      // Esquinas prominentes
  extraLarge: 25, // Esquinas muy redondeadas
};
```

## Utilidades

### svg-builder.ts

Builder funcional para construir SVGs de forma declarativa:

```typescript
import { rect, line, circle, arc, path, polygon, text, 
         arrowhead, extensionLine, dimensionLine, scaleBar, 
         group, svg, viewLabel } from '@/lib/svg-engine/utils/svg-builder';
```

| Función           | Descripción                                        |
|-------------------|----------------------------------------------------|
| `rect()`          | Rectángulo (con radio de esquina opcional)         |
| `line()`          | Línea entre dos puntos                             |
| `circle()`        | Círculo con centro y radio                         |
| `arc()`           | Arco circular                                      |
| `path()`          | Path SVG con atributo `d`                          |
| `polygon()`       | Polígono cerrado desde array de puntos             |
| `text()`          | Texto con posicionamiento y alineación             |
| `arrowhead()`     | Punta de flecha para cotas                         |
| `extensionLine()` | Línea de extensión para anotaciones                |
| `dimensionLine()` | Línea de cota completa con flechas y texto         |
| `scaleBar()`      | Barra de escala con divisiones                     |
| `group()`         | Grupo `<g>` con atributos opcionales               |
| `svg()`           | Elemento raíz `<svg>`                              |
| `viewLabel()`     | Etiqueta de vista (PLANTA, FRONTAL, LATERAL)       |

### geometry.ts

Funciones de cálculo geométrico:

```typescript
import { distance, angle, midpoint, offsetPoint, scalePoint,
         rotatePoint, lerp, boundingBox, cmToPixels,
         feetInchesToCm, cmToInches, cmToFeetInchesStr,
         formatDimension, distributePositions, rectCorners,
         rectCenter, clamp } from '@/lib/svg-engine/utils/geometry';
```

| Función             | Descripción                                        |
|---------------------|----------------------------------------------------|
| `distance()`        | Distancia euclidiana entre dos puntos              |
| `angle()`           | Ángulo entre dos puntos                            |
| `midpoint()`        | Punto medio entre dos puntos                       |
| `offsetPoint()`     | Desplazamiento de un punto por dx, dy              |
| `scalePoint()`      | Escala un punto desde un origen                     |
| `rotatePoint()`     | Rota un punto alrededor de un origen                |
| `lerp()`            | Interpolación lineal                                |
| `boundingBox()`     | Caja delimitadora de un array de puntos             |
| `cmToPixels()`      | Conversión cm → píxeles con escala                  |
| `feetInchesToCm()`  | Conversión pies+pulgadas → centímetros              |
| `cmToInches()`      | Conversión cm → pulgadas                            |
| `cmToFeetInchesStr()` | Conversión cm → string "X' Y\""                   |
| `formatDimension()` | Formatea una dimensión con unidad                   |
| `distributePositions()` | Distribuye N elementos uniformemente            |
| `rectCorners()`     | 4 esquinas de un rectángulo                         |
| `rectCenter()`      | Centro de un rectángulo                             |
| `clamp()`           | Restringe un valor entre mínimo y máximo            |

## Flujo de Renderizado

```
generateFurnitureDrawing(type, dims, shape, opts)
  │
  ├─ determineFurnitureType() → 'chair' | 'sofa' | 'table' | 'bed' | 'generic'
  ├─ normalizeDimensions() → rellena valores faltantes con defaults por tipo
  ├─ normalizeShapeProfile() → rellena campos faltantes del perfil
  │
  ├─ calculateScale() → escala consistente para las 3 vistas
  │     └─ Elige la escala más pequeña (más zoom out) para consistencia
  │
  ├─ generatePlantView(dims, shape, type, config)
  │     └─ Renderiza vista de planta con cotas
  ├─ generateFrontalView(dims, shape, type, config)
  │     └─ Renderiza vista frontal con cotas
  └─ generateLateralView(dims, shape, type, config)
        └─ Renderiza vista lateral con cotas
```
