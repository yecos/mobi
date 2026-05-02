# MOBI — Visión General de la Aplicación

> Documentación de referencia rápida — complementa el manual PDF principal de MOBI.

## ¿Qué es MOBI?

MOBI es un generador de fichas de especificación de mobiliario impulsado por inteligencia artificial. La aplicación permite a diseñadores de mobiliario, arquitectos y fabricantes crear fichas técnicas profesionales de forma automática a partir de una simple fotografía de una pieza de mobiliario. MOBI combina análisis visual por IA, un motor SVG puro en TypeScript para dibujos técnicos y generación de PDF para producir documentos listos para producción.

## Propósito

El flujo de trabajo tradicional para crear fichas de especificación de mobiliario es manual, lento y propenso a errores. MOBI automatiza todo el proceso:

1. **Captura** — El usuario sube una fotografía del mueble.
2. **Análisis** — La IA extrae tipo, estilo, materiales, dimensiones estimadas y perfil de forma.
3. **Edición** — El usuario refina los datos extraídos en un formulario interactivo.
4. **Generación** — El motor SVG produce dibujos técnicos ortográficos (planta, frontal, lateral) y la IA genera imágenes de concepto.
5. **Aprobación** — El usuario revisa los dibujos técnicos y los aprueba.
6. **Guardado** — El proyecto se persiste en base de datos (SQLite) o almacenamiento en memoria.
7. **Completado** — Se generan los PDFs finales (métrico, imperial, combinado, catálogo) para descarga.

## Estados del Flujo de Trabajo

La aplicación está gestionada por una máquina de estados en Zustand. Los estados posibles son:

| Estado        | Descripción                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `upload`      | Pantalla inicial. El usuario arrastra o selecciona una imagen.              |
| `analyzing`   | La imagen se envía a la IA para extracción de datos. Muestra progreso.      |
| `editing`     | Formulario completo para refinar datos: dimensiones, materiales, colores.   |
| `generating`  | Se generan los dibujos SVG y el concepto visual por IA.                     |
| `approving`   | Vista previa de los 3 dibujos ortográficos. El usuario aprueba o regresa.  |
| `saving`      | El proyecto se guarda en la base de datos.                                  |
| `complete`    | PDFs generados y disponibles para descarga. Se puede iniciar un nuevo ciclo.|

## Panel Copilot

El **Copilot** es un panel lateral interactivo que ofrece un flujo de trabajo avanzado de 3 pasos para generar fichas de producto con calidad de estudio arquitectónico:

1. **Análisis Copilot** — Envía la imagen a la IA con un prompt especializado VIVA MOBILI que extrae datos detallados (tipo, estilo, materiales, paleta de colores, anotaciones de diseño).
2. **Generación de Vistas** — Utiliza IA de generación de imágenes (Z-AI o DALL-E 3) para crear 4 renders fotorrealistas: frontal, lateral, planta y perspectiva 3/4.
3. **Ficha de Producto** — Genera un PDF profesional con layout arquitectónico: cabecera VIVA MOBILI, especificaciones, grilla de vistas 2×2, anotaciones de diseño y paleta de colores.

El Copilot utiliza un esquema de datos propio (`CopilotFurnitureData`) optimizado para fichas de producto de alta gama.

## Características Clave

- **Análisis visual multi-proveedor** — Cascada de IA: Z-AI (GLM-4V Plus) → Azure OpenAI (GPT-4o Vision) → Google Gemini 2.0 Flash → Smart Defaults.
- **Motor SVG puro en TypeScript** — Sin dependencias externas de PDF/SVG. Genera dibujos técnicos ortográficos con cotas, líneas de extensión y barras de escala.
- **5 tipos de mueble** — Silla, sofá, mesa, cama y genérico, cada uno con geometría específica.
- **3 vistas ortográficas** — Planta (planta/top), Frontal, Lateral con anotaciones de dimensiones.
- **Unidades duales** — Sistema métrico (cm) e imperial (pies + pulgadas) con conversión automática.
- **Generación de concepto por IA** — Imágenes de concepto generadas con Z-AI.
- **PDF profesional** — Generación de PDF 1.4 puro (sin librerías externas) con layout arquitectónico.
- **Catálogo** — Generación de PDF catálogo con múltiples piezas de mobiliario.
- **Bilingüe** — Interfaz en inglés y español.
- **Almacenamiento dual** — SQLite (Prisma) para persistencia real, store en memoria como fallback.
- **Despliegue flexible** — Vercel (serverless), Docker (self-hosted), o Caddy reverse proxy.
