# MOBI — Arquitectura

> Documentación de referencia rápida — Arquitectura técnica de MOBI.

## Stack Tecnológico

| Capa                | Tecnología                                       | Versión  |
|---------------------|--------------------------------------------------|----------|
| Framework           | Next.js (App Router)                             | 16       |
| UI                  | React                                            | 19       |
| Lenguaje            | TypeScript                                       | 5.x      |
| Estilos             | Tailwind CSS                                     | 4        |
| Componentes UI      | shadcn/ui                                        | latest   |
| Estado Global       | Zustand (con middleware `persist`)               | 5        |
| ORM / Base de Datos | Prisma + SQLite                                  | 6        |
| IA — Visión         | Z-AI SDK (GLM-4V Plus)                           | —        |
| IA — Premium        | Azure OpenAI (GPT-4o Vision + DALL-E 3)          | —        |
| IA — Fallback       | Google Gemini 2.0 Flash                          | —        |
| Procesamiento Img.  | Sharp                                            | —        |
| PDF                 | Generación pura (PDF 1.4 sin librerías externas) | —        |
| SVG                 | Motor SVG puro en TypeScript                     | —        |

## Estructura de Carpetas

```
mobi/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Layout raíz
│   │   ├── page.tsx                  # Página principal (SPA)
│   │   ├── globals.css               # Estilos globales
│   │   └── api/                      # API Routes (8 endpoints)
│   │       ├── analyze/route.ts
│   │       ├── generate-concept/route.ts
│   │       ├── generate-drawing/route.ts
│   │       ├── generate-pdf/route.ts
│   │       ├── copilot/
│   │       │   ├── route.ts
│   │       │   ├── generate-views/route.ts
│   │       │   └── generate-sheet/route.ts
│   │       └── projects/
│   │           ├── route.ts
│   │           └── [id]/route.ts
│   ├── components/                   # Componentes React
│   │   ├── upload/                   # UploadZone, FeatureCards
│   │   ├── analyzing/                # AnalyzingView
│   │   ├── editing/                  # EditingView + tarjetas (Dimensions, Materials, etc.)
│   │   ├── generating/               # GeneratingView
│   │   ├── approval/                 # ApprovalView
│   │   ├── complete/                 # CompleteView
│   │   ├── copilot/                  # CopilotPanel
│   │   ├── layout/                   # AppHeader
│   │   ├── showcase/                 # HeroSection, HowItWorks, SampleShowcase
│   │   ├── ui/                       # Componentes shadcn/ui (50+)
│   │   └── svg-preview.tsx           # Previsualizador SVG
│   ├── hooks/                        # Custom hooks
│   │   ├── use-analysis.ts
│   │   ├── use-copilot.ts
│   │   ├── use-dimensions.tsx
│   │   ├── use-image-upload.ts
│   │   ├── use-language.ts
│   │   ├── use-pdf-generation.ts
│   │   ├── use-catalog.ts
│   │   └── use-mobile.ts
│   ├── lib/                          # Lógica de negocio
│   │   ├── svg-engine/               # Motor SVG (renderizado técnico)
│   │   │   ├── index.ts              # API pública
│   │   │   ├── renderer.ts           # Orquestador principal
│   │   │   ├── types.ts              # Tipos del motor
│   │   │   ├── styles.ts             # Constantes de estilo
│   │   │   ├── scale.ts              # Cálculo de escalas
│   │   │   ├── dimensions.ts         # Anotaciones de cotas
│   │   │   ├── views/                # Generadores por vista
│   │   │   │   ├── plant-view.ts
│   │   │   │   ├── frontal-view.ts
│   │   │   │   └── lateral-view.ts
│   │   │   ├── furniture/            # Geometría por tipo de mueble
│   │   │   │   ├── chair.ts
│   │   │   │   ├── sofa.ts
│   │   │   │   ├── table.ts
│   │   │   │   ├── bed.ts
│   │   │   │   └── generic.ts
│   │   │   └── utils/                # Utilidades SVG
│   │   │       ├── svg-builder.ts
│   │   │       └── geometry.ts
│   │   ├── pdf/                      # Generación de PDF
│   │   │   └── page-generator.ts
│   │   ├── ai-concept-generator.ts   # Generación de conceptos IA
│   │   ├── azure-openai.ts           # Cliente Azure OpenAI
│   │   ├── db.ts                     # Cliente Prisma
│   │   ├── convert.ts                # Conversión de unidades
│   │   ├── types.ts                  # Tipos compartidos
│   │   ├── i18n.ts                   # Internacionalización
│   │   ├── translations.ts           # Diccionario de traducciones
│   │   └── utils.ts                  # Utilidades generales
│   └── store/
│       └── app-store.ts              # Zustand store (estado global)
├── prisma/
│   └── schema.prisma                 # Esquema de base de datos
├── db/
│   └── custom.db                     # Base de datos SQLite
├── public/                           # Archivos estáticos
├── Caddyfile                         # Configuración Caddy
├── next.config.ts                    # Configuración Next.js
├── vercel.json                       # Configuración Vercel
├── tailwind.config.ts                # Configuración Tailwind
├── components.json                   # Configuración shadcn/ui
└── package.json
```

## Arquitectura SPA

MOBI funciona como una **Single Page Application** dentro de Next.js. La página principal (`page.tsx`) renderiza condicionalmente los diferentes componentes de vista según el estado del flujo de trabajo (`appState` en el store de Zustand):

```
upload → analyzing → editing → generating → approving → saving → complete
  │          │          │          │            │          │         │
  ▼          ▼          ▼          ▼            ▼          ▼         ▼
UploadZone  Analyzing  Editing   Generating   Approval   (auto)   CompleteView
            View       View      View         View               + Downloads
```

No hay navegación por rutas. La transición entre estados se maneja exclusivamente mediante `setState()` en el store global. El store se persiste parcialmente (idioma y catálogo) en `localStorage` vía el middleware `persist` de Zustand.

## Decisiones Arquitectónicas Clave

### 1. Sin librería PDF externa — Motor PDF puro

MOBI genera PDFs 1.4 directamente construyendo el formato binario desde cero. No depende de `pdfkit`, `jspdf` ni ninguna otra librería de terceros. Esto elimina vulnerabilidades de dependencias, reduce el tamaño del bundle y da control total sobre el layout.

### 2. Motor SVG puro en TypeScript

El motor de dibujos técnicos está escrito completamente en TypeScript sin depender de `d3`, `snapsvg` ni librerías de visualización. Las primitivas SVG (`rect`, `line`, `circle`, `path`, `polygon`) se construyen con un builder funcional. Esto garantiza determinismo, facilidad de pruebas y cero overhead de dependencias.

### 3. Cascada multi-proveedor de IA

La estrategia de IA es una cascada con degradación elegante:

```
Z-AI (GLM-4V Plus) → Azure OpenAI (GPT-4o Vision) → Gemini 2.0 Flash → Smart Defaults
```

Cada proveedor tiene timeout independiente. Si el primario falla, se intenta el siguiente. Si todos fallan, se generan datos por defecto inteligentes basados en la categoría del mueble (silla, sofá, mesa, cama) con dimensiones ergonómicas estándar.

### 4. Almacenamiento dual

- **SQLite (Prisma)** — Persistencia real cuando la base de datos está disponible.
- **Memoria** — Fallback en memoria para entornos serverless (Vercel) donde SQLite puede no estar disponible tras un cold start. Los endpoints de proyectos detectan automáticamente la disponibilidad de la BD y degradan con gracia.

### 5. Unidades duales

Las dimensiones se almacenan internamente en formato imperial (`{ feet, inches }`) pero el motor SVG trabaja en centímetros. La conversión es automática. El usuario puede alternar entre métrico e imperial en cualquier momento. Los PDFs se generan en ambos sistemas simultáneamente.
