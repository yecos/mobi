# MOBI — Referencia de API

> Documentación de referencia rápida — Todos los endpoints de la API REST de MOBI.

## Resumen de Endpoints

| Método  | Ruta                              | Descripción                                      |
|---------|-----------------------------------|--------------------------------------------------|
| POST    | `/api/analyze`                    | Analiza imagen de mueble con IA                   |
| POST    | `/api/generate-concept`           | Genera imagen de concepto con IA                  |
| POST    | `/api/generate-drawing`           | Genera dibujos técnicos SVG                       |
| POST    | `/api/generate-pdf`               | Genera PDF(s) de ficha técnica                    |
| POST    | `/api/copilot`                    | Análisis Copilot (datos VIVA MOBILI)              |
| POST    | `/api/copilot/generate-views`     | Genera vistas fotorrealistas con IA               |
| POST    | `/api/copilot/generate-sheet`     | Genera PDF de ficha de producto Copilot           |
| GET     | `/api/projects`                   | Lista proyectos paginados                         |
| POST    | `/api/projects`                   | Guarda un nuevo proyecto                          |
| GET     | `/api/projects/[id]`             | Obtiene un proyecto por ID                        |
| PUT     | `/api/projects/[id]`             | Actualiza un proyecto                             |
| DELETE  | `/api/projects/[id]`             | Elimina un proyecto                               |

Todos los endpoints POST aceptan y retornan JSON. `maxDuration: 60` para la mayoría, `120` para generación de vistas.

---

## POST /api/analyze

Analiza una imagen de mobiliario usando la cascada de IA y retorna los datos extraídos.

### Request

**Content-Type:** `application/json` o `multipart/form-data`

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

O como `multipart/form-data` con campo `image` (File).

### Response (200)

```json
{
  "success": true,
  "data": {
    "productName": "Silla de Comedor",
    "brand": "Nordic Home",
    "referenceNumber": "NH-2024-001",
    "description": "Dining chair with solid oak frame...",
    "descriptionEs": "Silla de comedor con marco de roble macizo...",
    "dimensions": {
      "height": { "feet": 2, "inches": 10 },
      "width": { "feet": 1, "inches": 10 },
      "depth": { "feet": 1, "inches": 10 },
      "widthExtended": { "feet": 0, "inches": 0 },
      "seatDepth": { "feet": 1, "inches": 4 },
      "depthExtended": { "feet": 0, "inches": 0 }
    },
    "materials": [
      { "material": "Oak", "quantity": 1, "description": "Frame", "observations": "" }
    ],
    "quantity": 1,
    "colorFinishes": [{ "name": "Natural Oak", "color": "#8B6914" }],
    "loungeConfigurations": [],
    "category": "chair",
    "tags": ["dining", "oak", "modern"],
    "observations": "",
    "shapeProfile": {
      "bodyShape": "rectangular",
      "cornerStyle": "slightly-rounded",
      "hasBackrest": true,
      "backrestShape": "flat",
      "hasArmrests": false,
      "armrestShape": "none",
      "legType": "tapered",
      "legCount": 4,
      "seatShape": "flat",
      "topViewOutline": "Rectangular seat with slim backrest",
      "sideProfile": "L-shaped with straight backrest"
    }
  },
  "provider": "Z-AI (GLM-4V Plus)"
}
```

### Campos adicionales en caso de fallback

```json
{
  "success": true,
  "data": { ... },
  "provider": "Smart Defaults (AI rate limited)",
  "isEstimated": true,
  "warning": "AI service is currently busy...",
  "retryable": true,
  "originalError": "..."
}
```

---

## POST /api/generate-concept

Genera una imagen de concepto visual del mueble usando IA (Z-AI).

### Request

```json
{
  "furnitureData": {
    "category": "chair",
    "dimensions": { "height": { "feet": 2, "inches": 10 }, ... },
    "style": "Moderno",
    "materials": [{ "material": "Wood" }],
    "finish": "Natural",
    "shapeProfile": { ... }
  }
}
```

### Response (200)

```json
{
  "success": true,
  "conceptImageBase64": "/9j/4AAQ...",
  "conceptPrompt": "Create a furniture design concept sketch..."
}
```

---

## POST /api/generate-drawing

Genera los 3 dibujos técnicos SVG (planta, frontal, lateral) usando el motor SVG puro.

### Request

```json
{
  "furnitureData": {
    "productName": "Silla",
    "category": "chair",
    "dimensions": {
      "height": { "feet": 2, "inches": 10 },
      "width": { "feet": 1, "inches": 10 },
      "depth": { "feet": 1, "inches": 10 }
    },
    "shapeProfile": {
      "bodyShape": "rectangular",
      "hasBackrest": true,
      "legType": "tapered",
      "legCount": 4
    }
  }
}
```

### Response (200)

```json
{
  "success": true,
  "svgViews": {
    "plant": "<svg xmlns=\"http://www.w3.org/2000/svg\" ...>...</svg>",
    "frontal": "<svg xmlns=\"http://www.w3.org/2000/svg\" ...>...</svg>",
    "lateral": "<svg xmlns=\"http://www.w3.org/2000/svg\" ...>...</svg>"
  },
  "scale": 2.5
}
```

---

## POST /api/generate-pdf

Genera PDF(s) de ficha técnica. Soporta 3 modos: separado, combinado y catálogo.

### Request

```json
{
  "furnitureData": { ... },
  "imageBase64": "data:image/jpeg;base64,...",
  "unitSystem": "metric",
  "mode": "separate",
  "svgViews": { "plant": "...", "frontal": "...", "lateral": "..." },
  "conceptImageBase64": "...",
  "conceptPrompt": "..."
}
```

| Campo               | Tipo      | Descripción                                           |
|---------------------|-----------|-------------------------------------------------------|
| `furnitureData`     | object    | Datos completos del mueble (requerido)                |
| `imageBase64`       | string?   | Imagen original del mueble                            |
| `unitSystem`        | string?   | `"metric"` o `"imperial"`. Si se omite, genera ambos  |
| `mode`              | string?   | `"separate"` (default), `"combined"`, `"catalog"`     |
| `catalogItems`      | array?    | Para modo catálogo: array de FurnitureData             |
| `catalogImages`     | array?    | Para modo catálogo: array de imágenes base64           |
| `svgViews`          | object?   | SVGs de las 3 vistas                                  |
| `conceptImageBase64`| string?   | Imagen de concepto IA                                 |
| `conceptPrompt`     | string?   | Prompt usado para el concepto                          |

### Response — Modo separado

```json
{
  "success": true,
  "metric": "base64-pdf-content...",
  "imperial": "base64-pdf-content..."
}
```

### Response — Modo combinado

```json
{
  "success": true,
  "mode": "combined",
  "pdf": "base64-pdf-content..."
}
```

### Response — Modo catálogo

```json
{
  "success": true,
  "mode": "catalog",
  "pdf": "base64-pdf-content..."
}
```

---

## POST /api/copilot

Análisis avanzado de mobiliario para el flujo Copilot. Retorna datos en formato VIVA MOBILI (`CopilotFurnitureData`) con paleta de colores, anotaciones y detalles de materiales.

### Request

Igual que `/api/analyze` (imagen en JSON o multipart).

### Response (200)

```json
{
  "success": true,
  "data": {
    "productType": "chair",
    "style": "modern",
    "material": {
      "main": "wood",
      "details": ["Solid oak frame", "Hand-woven cane panel", "Natural grain finish"]
    },
    "finish": "natural",
    "feature": "woven cane",
    "dimensions": {
      "height": 85,
      "width": 50,
      "depth": 52,
      "seatHeight": 45
    },
    "weight": 5,
    "annotations": [
      "Solid oak frame with visible grain pattern",
      "Mortise and tenon joints at frame connections",
      "Hand-woven cane panel with natural finish"
    ],
    "colorPalette": {
      "primary": "#8B7355",
      "secondary": "#D4A574",
      "pearlGray": "#E5E5E5",
      "darkGray": "#4A4A4A"
    },
    "brand": "VIVA MOBILI",
    "renderViews": ["front", "side", "top", "perspective"]
  },
  "provider": "Z-AI (GLM-4V Plus)"
}
```

---

## POST /api/copilot/generate-views

Genera imágenes fotorrealistas de las vistas del mueble usando IA de generación de imágenes.

### Request

```json
{
  "furnitureData": {
    "productType": "chair",
    "style": "modern",
    "material": { "main": "wood", "details": ["Solid oak frame"] },
    "finish": "natural",
    "feature": "woven cane",
    "dimensions": { "height": 85, "width": 50, "depth": 52, "seatHeight": 45 },
    "colorPalette": { "primary": "#8B7355", "secondary": "#D4A574", ... },
    "brand": "VIVA MOBILI"
  },
  "views": ["front", "side", "top", "perspective"]
}
```

### Response (200)

```json
{
  "success": true,
  "viewImages": {
    "front": "base64-image...",
    "side": "base64-image...",
    "top": "base64-image...",
    "perspective": "base64-image..."
  },
  "generatedCount": 4
}
```

Las vistas que no se pudieron generar serán `null`.

---

## POST /api/copilot/generate-sheet

Genera un PDF profesional de ficha de producto VIVA MOBILI con layout arquitectónico.

### Request

```json
{
  "furnitureData": {
    "productType": "chair",
    "style": "modern",
    "material": { "main": "wood", "details": [...] },
    "finish": "natural",
    "feature": "woven cane",
    "dimensions": { "height": 85, "width": 50, "depth": 52, "seatHeight": 45 },
    "weight": 5,
    "annotations": [...],
    "colorPalette": { ... },
    "brand": "VIVA MOBILI",
    "renderViews": ["front", "side", "top", "perspective"]
  },
  "viewImages": {
    "front": "base64...",
    "side": "base64...",
    "top": "base64...",
    "perspective": "base64..."
  },
  "originalImage": "base64..."
}
```

### Response (200)

```json
{
  "success": true,
  "pdf": "base64-pdf-content..."
}
```

---

## GET /api/projects

Lista todos los proyectos guardados con paginación.

### Parámetros de Query

| Parámetro | Tipo   | Default | Descripción          |
|-----------|--------|---------|----------------------|
| `page`    | number | 1       | Número de página     |
| `limit`   | number | 20      | Elementos por página |

### Response (200)

```json
{
  "projects": [
    {
      "id": "proj_1700000000000_abc123",
      "name": "Silla de Comedor",
      "furnitureType": "chair",
      "description": "...",
      "width": 50,
      "height": 85,
      "depth": 52,
      "bodyShape": "rectangular",
      "approved": true,
      "unit": "cm",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "source": "database"
}
```

`source` puede ser `"database"` o `"memory"` (fallback).

---

## POST /api/projects

Guarda un nuevo proyecto en la base de datos (o memoria como fallback).

### Request

```json
{
  "name": "Silla de Comedor",
  "furnitureType": "chair",
  "description": "Silla moderna de roble",
  "observations": "",
  "dimensions": {
    "width": 50,
    "height": 85,
    "depth": 52,
    "seatHeight": 45
  },
  "shapeProfile": {
    "bodyShape": "rectangular",
    "hasBackrest": true,
    "hasArmrests": false,
    "legType": "tapered"
  },
  "materials": [...],
  "svgViews": {
    "plant": "<svg>...</svg>",
    "frontal": "<svg>...</svg>",
    "lateral": "<svg>...</svg>"
  },
  "unit": "cm",
  "scale": 2.5
}
```

### Response (200)

```json
{
  "success": true,
  "project": {
    "id": "proj_1700000000000_abc123",
    "name": "Silla de Comeder",
    ...
  },
  "source": "database"
}
```

---

## GET /api/projects/[id]

Obtiene un proyecto específico por su ID.

### Response (200)

```json
{
  "project": {
    "id": "proj_1700000000000_abc123",
    "name": "Silla de Comedor",
    ...
  }
}
```

### Errores

| Status | Descripción                  |
|--------|------------------------------|
| 404    | Proyecto no encontrado       |
| 503    | Base de datos no disponible  |

---

## PUT /api/projects/[id]

Actualiza un proyecto existente. El body puede contener cualquier campo parcial del proyecto.

### Request

```json
{
  "name": "Silla de Comedor Actualizada",
  "observations": "Nuevas observaciones"
}
```

### Response (200)

```json
{
  "success": true,
  "project": { ... }
}
```

---

## DELETE /api/projects/[id]

Elimina un proyecto por su ID.

### Response (200)

```json
{
  "success": true
}
```

### Errores

| Status | Descripción                  |
|--------|------------------------------|
| 503    | Base de datos no disponible  |
