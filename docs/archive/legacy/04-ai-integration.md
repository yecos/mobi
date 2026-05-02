# MOBI — Integración de IA

> Documentación de referencia rápida — Estrategia multi-proveedor, concept generator y pipeline del Copilot.

## Estrategia Multi-Proveedor

MOBI utiliza una arquitectura de cascada con degradación elegante para maximizar la disponibilidad del servicio de IA. Cada proveedor tiene un timeout independiente y se intenta secuencialmente:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CASCADA DE IA                                │
│                                                                     │
│  1. Z-AI (GLM-4V Plus) ─── PRIMARIO ─── Sin configuración extra    │
│         ↓ falla                                                     │
│  2. Azure OpenAI (GPT-4o Vision) ─── PREMIUM ─── Requiere config   │
│         ↓ falla                                                     │
│  3. Google Gemini 2.0 Flash ─── FALLBACK ─── Requiere API key      │
│         ↓ falla                                                     │
│  4. Smart Defaults ─── ÚLTIMO RECURSO ─── Datos ergonómicos estándar│
└─────────────────────────────────────────────────────────────────────┘
```

### Z-AI (GLM-4V Plus) — Primario

- **Proveedor:** Z-AI Web Dev SDK (`z-ai-web-dev-sdk`)
- **Modelo de visión:** GLM-4V Plus
- **Modelo de generación:** Imágenes por defecto del SDK
- **Ventaja:** Funciona inmediatamente sin configuración adicional
- **Configuración:** Busca archivo `.z-ai-config` en múltiples rutas o usa variables de entorno `ZAI_BASE_URL` y `ZAI_API_KEY`
- **Timeout:** 25s (análisis), 8s (init), 45s (generación de imágenes)

### Azure OpenAI (GPT-4o Vision + DALL-E 3) — Premium

- **Visión:** GPT-4o con capacidades de visión (detalle: high)
- **Generación de imágenes:** DALL-E 3 (calidad HD, 1024×1024)
- **Chat sin visión:** GPT-4o (texto como fallback)
- **Ventaja:** Mayor calidad de análisis y generación de imágenes
- **Requiere:** Configuración completa de Azure OpenAI (ver variables de entorno abajo)

### Google Gemini 2.0 Flash — Fallback

- **Endpoint:** `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Ventaja:** Gratuito con API key, buena disponibilidad
- **Temperatura:** 0.2 (baja para maximizar precisión)
- **Max tokens:** 4000-8000 según endpoint
- **Reintentos:** 2 reintentos con backoff exponencial (3s, 6s) en caso de rate limit (429)

### Smart Defaults — Último Recurso

Cuando todos los proveedores de IA fallan, MOBI genera datos por defecto inteligentes basados en la categoría del mueble. Utiliza dimensiones ergonómicas estándar:

| Categoría | Altura | Ancho | Profundidad | Altura Asiento |
|-----------|--------|-------|-------------|----------------|
| Chair     | 2'10"  | 1'10" | 1'10"       | 1'6"           |
| Sofa      | 2'10"  | 6'0"  | 2'6"        | 1'5"           |
| Table     | 2'6"   | 4'0"  | 2'0"        | —              |
| Bed       | 3'0"   | 5'0"  | 6'6"        | —              |

La respuesta incluye `isEstimated: true` y un mensaje de `warning` para que el usuario sepa que los datos son estimados y debe verificar manualmente.

## Generador de Conceptos

El módulo `ai-concept-generator.ts` genera imágenes de concepto visual del mueble:

```typescript
import { generateConceptSketch } from '@/lib/ai-concept-generator';

const result = await generateConceptSketch(furnitureData);
// result: { imageBase64: string, prompt: string } | null
```

### Flujo Interno

1. Extrae parámetros clave del `FurnitureData`: categoría, estilo, material principal, acabado, característica especial, dimensiones.
2. Construye un prompt detallado: *"Create a furniture design concept sketch for a [category] in [style] style. Material: [material] Color: [color]..."*
3. Llama a Z-AI Image Generation (`zai.images.generations.create`) con tamaño 1024×1024.
4. Retorna la imagen en base64 y el prompt usado.

Si la generación falla, retorna `null` silenciosamente sin bloquear el flujo.

## Pipeline del Copilot (3 Pasos)

El Copilot implementa un pipeline de 3 pasos para generar fichas de producto profesionales:

### Paso 1: Análisis Copilot (`POST /api/copilot`)

Envía la imagen a la IA con un prompt especializado VIVA MOBILI que extrae datos detallados en un formato enriquecido:

```
Imagen → IA (cascada) → CopilotFurnitureData
```

El prompt del Copilot es más detallado que el de `/api/analyze`:
- **Tipo de producto** — 10 categorías (chair, stool, table, sofa, bed, desk, cabinet, shelving, bench, ottoman)
- **Estilo** — 10 estilos (modern, minimalist, luxury, industrial, scandinavian, mid-century, rustic, transitional, contemporary, art-deco)
- **Material** — Objeto con material principal + array de detalles específicos
- **Acabado** — 10 opciones (natural, matte, polished, lacquered, oiled, waxed, brushed, powder-coated, upholstered, stained)
- **Característica** — Característica distintiva más notable
- **Dimensiones** — En centímetros como números (no strings)
- **Peso** — Estimación realista en kg
- **Anotaciones** — Exactamente 3: material, ensamblaje, detalle funcional
- **Paleta de colores** — 4 colores hex: primary, secondary, pearlGray, darkGray
- **Marca** — Siempre "VIVA MOBILI"
- **Vistas a renderizar** — ["front", "side", "top", "perspective"]

### Paso 2: Generación de Vistas (`POST /api/copilot/generate-views`)

Genera 4 imágenes fotorrealistas del mueble usando IA de generación de imágenes:

```
CopilotFurnitureData → Prompts por vista → IA (Z-AI o DALL-E 3) → Imágenes base64
```

Cada vista tiene un prompt específico:
- **Frontal** — Vista de frente con dimensiones alto × ancho
- **Lateral** — Vista lateral derecha con dimensiones alto × profundidad
- **Planta** — Vista superior con dimensiones ancho × profundidad
- **Perspectiva** — Vista 3/4 elevada mostrando frente, lado y superior

Los prompts incluyen especificaciones de estilo: *"Photorealistic product photography on pearl gray background. Architectural precision. Balanced studio lighting. Professional typography."*

La generación es secuencial (no paralela) para evitar rate limits.

### Paso 3: Ficha de Producto (`POST /api/copilot/generate-sheet`)

Genera un PDF profesional VIVA MOBILI con layout arquitectónico:

```
CopilotFurnitureData + ViewImages → buildProductSheetPDF() → PDF 1.4
```

El PDF incluye:
- **Cabecera** — Barra de marca VIVA MOBILI con color primary
- **Título** — Tipo de producto + estilo + material + acabado
- **Especificaciones** — Grid de campos (material, acabado, feature, dimensiones, peso)
- **Detalles de material** — Lista de detalles específicos
- **Grilla de vistas** — 2×2 (frontal, lateral, planta, perspectiva) con dimensiones
- **Anotaciones de diseño** — 3 anotaciones con iconos (Textura, Estructura, Funcional)
- **Paleta de colores** — 4 franjas con labels y hex codes
- **Pie de página** — Marca + fecha

## Variables de Entorno

### Z-AI (Primario — sin configuración extra requerida)

```bash
# Archivo .z-ai-config (auto-descubierto) o variables de entorno:
ZAI_BASE_URL=https://your-zai-endpoint.com
ZAI_API_KEY=your-zai-api-key
ZAI_CHAT_ID=optional-chat-id
ZAI_TOKEN=optional-token
ZAI_USER_ID=optional-user-id
```

### Azure OpenAI (Premium — opcional)

```bash
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_VISION_DEPLOYMENT=gpt-4o         # Opcional, default = DEPLOYMENT_NAME
AZURE_OPENAI_DALLE_DEPLOYMENT=dall-e-3        # Requerido para generación de imágenes
```

> **Importante:** Usar GPT-4o (no GPT-4, deprecado Nov 2025). Se necesitan dos deployments en Azure: `gpt-4o` para visión y `dall-e-3` para generación.

### Google Gemini (Fallback — opcional)

```bash
GEMINI_API_KEY=your-gemini-api-key
```

### Base de Datos

```bash
DATABASE_URL=file:./db/custom.db    # Ruta a la base de datos SQLite
```

## Compresión de Imágenes

Antes de enviar imágenes a cualquier proveedor de IA, MOBI las comprime server-side usando Sharp:

- **Dimensión máxima:** 800px (manteniendo aspect ratio)
- **Formato de salida:** JPEG calidad 75%
- **Reducción típica:** 10x en tamaño base64
- **Propósito:** Reducir payload para evitar rate limits y timeouts

Si Sharp falla (poco probable), se usa la imagen original sin comprimir.
