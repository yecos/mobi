# MOBI — Despliegue

> Documentación de referencia rápida — Configuración de entorno, despliegue en Vercel, Docker y Caddy.

## Variables de Entorno

### Variables Requeridas

| Variable          | Descripción                                     | Ejemplo                              |
|-------------------|-------------------------------------------------|--------------------------------------|
| `DATABASE_URL`    | Ruta a la base de datos SQLite                   | `file:./db/custom.db`                |

### Variables de IA — Z-AI (Primario)

Z-AI funciona por defecto si el archivo `.z-ai-config` existe en el proyecto o el home directory. Si no, se pueden configurar via variables de entorno:

| Variable          | Descripción                                     | Requerido |
|-------------------|-------------------------------------------------|-----------|
| `ZAI_BASE_URL`    | URL base del endpoint Z-AI                       | Sí*       |
| `ZAI_API_KEY`     | API key para Z-AI                                | Sí*       |
| `ZAI_CHAT_ID`     | Chat ID opcional                                 | No        |
| `ZAI_TOKEN`       | Token opcional                                   | No        |
| `ZAI_USER_ID`     | User ID opcional                                 | No        |

\* O bien existe `.z-ai-config`, o bien estas variables deben estar configuradas.

### Variables de IA — Azure OpenAI (Premium, Opcional)

| Variable                          | Descripción                          | Default                |
|-----------------------------------|--------------------------------------|------------------------|
| `AZURE_OPENAI_API_KEY`            | API key del recurso Azure OpenAI     | —                      |
| `AZURE_OPENAI_ENDPOINT`           | Endpoint del recurso                 | —                      |
| `AZURE_OPENAI_API_VERSION`        | Versión de la API                    | `2025-04-01-preview`   |
| `AZURE_OPENAI_DEPLOYMENT_NAME`    | Deployment de GPT-4o                 | `gpt-4o`               |
| `AZURE_OPENAI_VISION_DEPLOYMENT`  | Deployment de visión (si es diferente)| = DEPLOYMENT_NAME     |
| `AZURE_OPENAI_DALLE_DEPLOYMENT`   | Deployment de DALL-E 3               | `dall-e-3`             |

### Variables de IA — Google Gemini (Fallback, Opcional)

| Variable          | Descripción                                     | Requerido |
|-------------------|-------------------------------------------------|-----------|
| `GEMINI_API_KEY`  | API key de Google AI Studio                      | Sí        |

### Archivo .env.local (Ejemplo Completo)

```bash
# Base de datos
DATABASE_URL=file:./db/custom.db

# Z-AI (primario)
ZAI_BASE_URL=https://your-zai-endpoint.com
ZAI_API_KEY=your-zai-api-key

# Azure OpenAI (premium - opcional)
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_DALLE_DEPLOYMENT=dall-e-3

# Google Gemini (fallback - opcional)
GEMINI_API_KEY=your-gemini-key
```

## Configuración Next.js

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",          // Output standalone para Docker
  typescript: {
    ignoreBuildErrors: true,     // Ignora errores de TS en build
  },
  reactStrictMode: false,        // Desactivado para evitar doble render
  serverExternalPackages: [      // Paquetes que no se bundlean
    '@resvg/resvg-js',
    'sharp',
    '@imgly/background-removal'
  ],
};

export default nextConfig;
```

### Notas importantes

- **`output: "standalone"`** — Requerido para despliegue Docker. Genera un build autónomo en `.next/standalone/`.
- **`serverExternalPackages`** — Sharp y resvg-js son módulos nativos que deben ejecutarse fuera del bundle de Next.js.
- **`ignoreBuildErrors: true`** — Pragmático para desarrollo; en producción se recomienda activar verificación estricta.

## Despliegue en Vercel

MOBI está diseñado para funcionar en Vercel Serverless Functions.

### Configuración `vercel.json`

```json
{
  "functions": {
    "src/app/api/*/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Pasos de Despliegue

1. **Conectar repositorio** — Vincula el repositorio Git en el dashboard de Vercel.
2. **Configurar variables de entorno** — Añade todas las variables de entorno en Settings → Environment Variables.
3. **Z-AI en Vercel** — El archivo `.z-ai-config` se escribe en `/tmp/` (único directorio escribible en serverless). Las IPs internas (172.x.x.x) se descartan automáticamente.
4. **Base de datos** — SQLite funciona en `/tmp/` pero se pierde en cada cold start. El sistema degrada automáticamente al store en memoria. Para persistencia real, considerar migrar a PostgreSQL o usar Turso.
5. **Deploy** — Vercel detecta Next.js automáticamente y despliega.

### Limitaciones en Vercel

- **Cold starts** — La primera request puede ser lenta (inicialización de Sharp, Z-AI).
- **Sin persistencia SQLite** — El sistema degrada a memoria automáticamente.
- **Timeout** — Las funciones serverless tienen un máximo de 60s (Hobby) o 300s (Pro).
- **Tamaño del bundle** — Sharp añade ~30MB al bundle serverless.

## Despliegue con Docker

### Dockerfile (Ejemplo)

```dockerfile
FROM node:20-alpine AS base

# Instalar dependencias del sistema para Sharp
RUN apk add --no-cache libc6-compat vips-dev

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar build standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copiar base de datos
COPY --from=builder /app/db ./db

# Crear directorio para Z-AI config
RUN mkdir -p /tmp && chown nextjs:nodejs /tmp

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose (Ejemplo)

```yaml
version: '3.8'
services:
  mobi:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/db/custom.db
      - ZAI_BASE_URL=${ZAI_BASE_URL}
      - ZAI_API_KEY=${ZAI_API_KEY}
      - AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
      - AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - mobi-db:/app/db
    restart: unless-stopped

volumes:
  mobi-db:
```

## Configuración Caddy (Reverse Proxy)

MOBI incluye un `Caddyfile` configurado para proxy reverso en el puerto 81:

```caddyfile
:81 {
    @transform_port_query {
        query XTransformPort=*
    }

    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort} {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
```

### Características del Caddyfile

- **Puerto 81** — Escucha en puerto 81 (no 80/443 para no conflictuar con otros servicios).
- **Proxy dinámico** — Si la URL contiene `?XTransformPort=XXXX`, redirige al puerto indicado. Útil para debugging o múltiples instancias.
- **Proxy por defecto** — Redirige todo el tráfico a `localhost:3000` (Next.js).
- **Headers** — Preserva headers de proxy estándar (`X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-IP`).

### Para HTTPS automático con Caddy

```caddyfile
mobi.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Caddy gestionará automáticamente certificados Let's Encrypt.

## Persistencia de Base de Datos

### Esquema Prisma

```prisma
model FurnitureProject {
  id            String   @id @default(cuid())
  name          String
  furnitureType String
  description   String?
  observations  String?

  width         Float
  height        Float
  depth         Float
  seatHeight    Float?
  backrestHeight Float?
  armrestHeight  Float?
  legHeight      Float?
  topThickness   Float?
  mattressThickness Float?

  bodyShape     String
  hasBackrest   Boolean  @default(false)
  hasArmrests   Boolean  @default(false)
  legType       String
  seatShape     String?
  backrestShape String?

  materials     String?    // JSON string de MaterialItem[]
  originalImage String?
  plantSvg      String?
  frontalSvg    String?
  lateralSvg    String?

  approved      Boolean  @default(false)
  unit          String   @default("cm")
  scale         Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([furnitureType])
  @@index([createdAt])
}
```

### Comandos Prisma

```bash
# Generar cliente Prisma
npx prisma generate

# Crear migración
npx prisma migrate dev --name init

# Abrir Prisma Studio (visualizador de BD)
npx prisma studio

# Reset de base de datos
npx prisma migrate reset
```

### Ubicación de la Base de Datos

- **Desarrollo local:** `./db/custom.db` (configurado por `DATABASE_URL`)
- **Docker:** Volume `mobi-db` montado en `/app/db/`
- **Vercel:** `/tmp/` (efímero, se pierde en cold starts) — El sistema degrada a memoria

## Checklist Pre-Despliegue

- [ ] Variables de entorno configuradas (mínimo `DATABASE_URL` + Z-AI)
- [ ] Base de datos inicializada (`npx prisma migrate deploy`)
- [ ] Build exitoso (`npm run build`)
- [ ] Archivo `.z-ai-config` presente o variables `ZAI_*` configuradas
- [ ] Verificar que al menos un proveedor de IA responde (`curl` a `/api/analyze` con imagen test)
- [ ] Puerto 3000 accesible (o configurado en Caddy/Nginx)
- [ ] Volume de base de datos montado (Docker) para persistencia
