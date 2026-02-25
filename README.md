# VibePeak API Gateway

API Gateway para el servicio de procesamiento de imagenes de VibePeak. Gestiona autenticacion, creditos, control de concurrencia, despacho de jobs y entrega de webhooks.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │   Auth    │──▶│  Idempotency │──▶│  Job Controller  │ │
│  │Middleware │   │  Middleware   │   │                  │ │
│  └──────────┘   └──────────────┘   │ - Validate URLs   │ │
│                                     │ - Check credits   │ │
│                                     │ - Check concurr.  │ │
│                                     │ - Dispatch job    │ │
│                                     └────────┬─────────┘ │
│                                              │            │
│  ┌──────────────────┐   ┌───────────────────┐│           │
│  │ Webhook Service  │◀──│ Callback Handler  ││           │
│  │ - HMAC signing   │   │ - Update status   ││           │
│  │ - Retry w/ exp.  │   └───────────────────┘│           │
│  │   backoff        │                         │           │
│  └──────────────────┘                         │           │
│                                               ▼           │
│                                    ┌──────────────────┐  │
│                                    │  Mock Processor   │  │
│                                    │  (3-5s, ~20% fail)│  │
│                                    └──────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                  PostgreSQL                       │   │
│  │  users | jobs | idempotency_keys                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Decisiones de Diseno

- **Express + TypeScript**: Framework maduro con excelente tipado. Ideal para APIs REST.
- **PostgreSQL**: Soporte nativo de transacciones ACID para operaciones atomicas de creditos. `CHECK` constraints aseguran integridad.
- **Raw SQL via pg**: Sin ORM para mantener control total sobre las queries y reducir dependencias.
- **Migraciones manuales**: Sistema ligero que registra migraciones ejecutadas en tabla `_migrations`.
- **Mock Processor embebido**: Endpoint `/mock/process` que simula el servicio externo con delay y tasa de fallo configurable.

### Flujo de Creacion de Job

1. **Auth**: Bearer token → SHA-256 hash → lookup en `users`
2. **Idempotency**: Si existe `Idempotency-Key`, retorna respuesta cacheada
3. **Validacion**: `imageUrl` (anti-SSRF), `webhookUrl` (HTTPS + anti-SSRF)
4. **Concurrencia**: Verifica jobs activos vs limite del plan (basic: 1, pro: 5)
5. **Creditos**: Deduccion atomica con `UPDATE ... WHERE credits > 0`
6. **Dispatch**: Envia al servicio de procesamiento
7. **Rollback**: Si falla el dispatch → refund de credito + job marcado como `failed` + 503

### Seguridad

- **API Keys**: Almacenadas como hash SHA-256 (nunca en texto plano)
- **SSRF Prevention**: Validacion de URLs contra rangos de IPs privadas (RFC 1918, loopback, link-local, CGNAT) con resolucion DNS
- **Webhook HMAC**: Firma de payloads con `X-Webhook-Signature` usando HMAC-SHA256

## Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| `POST` | `/v1/jobs` | Bearer | Crear un nuevo job de procesamiento |
| `GET` | `/v1/jobs/:id` | Bearer | Consultar estado de un job |
| `POST` | `/internal/callback` | - | Callback interno del servicio de procesamiento |
| `GET` | `/health` | - | Health check |

## Requisitos

- Node.js >= 18
- Docker y Docker Compose

## Inicio Rapido

### Con Docker (recomendado)

```bash
# Clonar y entrar al directorio
cd technical-challenge-backend-infra

# Levantar todo (PostgreSQL + API)
docker compose up --build

# En otra terminal, sembrar datos de prueba
docker compose exec api node dist/db/seed.js
```

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar configuracion
cp .env.example .env

# Levantar solo PostgreSQL
docker compose up postgres -d

# Ejecutar migraciones y seed
npm run migrate
npm run seed

# Iniciar en modo desarrollo
npm run dev
```

## Uso

### Crear un job

```bash
curl -X POST http://localhost:3000/v1/jobs \
  -H "Authorization: Bearer vp_test_basic_key_123456" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-example.jpg",
    "webhookUrl": "https://your-server.com/webhook",
    "options": {
      "quality": "high",
      "format": "png"
    }
  }'
```

Respuesta (202):
```json
{
  "jobId": "job_a1b2c3d4e5f6",
  "status": "processing",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "imageUrl": "https://images.unsplash.com/photo-example.jpg",
  "webhookUrl": "https://your-server.com/webhook",
  "options": { "quality": "high", "format": "png" }
}
```

### Consultar estado

```bash
curl http://localhost:3000/v1/jobs/job_a1b2c3d4e5f6 \
  -H "Authorization: Bearer vp_test_basic_key_123456"
```

## Usuarios de Prueba

| Email | API Key | Plan | Creditos |
|-------|---------|------|----------|
| basic@vibepeak.com | `vp_test_basic_key_123456` | basic | 10 |
| pro@vibepeak.com | `vp_test_pro_key_789012` | pro | 100 |
| nocredits@vibepeak.com | `vp_test_nocredits_key_345678` | basic | 0 |

## Tests

```bash
# Ejecutar tests con cobertura
npm test

# Modo watch
npm run test:watch
```

## Estructura del Proyecto

```
src/
├── config/          # Configuracion centralizada
├── db/              # Pool de conexiones, migraciones, seed
├── middleware/       # Auth, error handler, idempotency
├── routes/          # Handlers de endpoints
├── services/        # Logica de negocio (credits, processing, webhook)
├── types/           # Tipos TypeScript compartidos
├── validators/      # Validacion de URLs (anti-SSRF)
├── app.ts           # Configuracion de Express
└── server.ts        # Entry point
tests/
└── unit/            # Tests unitarios
```

## Codigos de Error

| HTTP | Codigo | Descripcion |
|------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Campos requeridos faltantes o invalidos |
| 400 | `INVALID_URL` | URL de imagen no valida o apunta a IP privada |
| 400 | `INVALID_WEBHOOK_URL` | Webhook URL no es HTTPS o apunta a IP privada |
| 401 | `UNAUTHORIZED` | API key faltante o invalida |
| 402 | `INSUFFICIENT_CREDITS` | Sin creditos disponibles |
| 404 | `NOT_FOUND` | Job no encontrado (o pertenece a otro usuario) |
| 429 | `CONCURRENCY_LIMIT` | Limite de jobs concurrentes alcanzado |
| 503 | `DISPATCH_FAILED` | Error al enviar job al servicio de procesamiento |

## Gitflow

Este proyecto utiliza el siguiente flujo de branches:

- `main` — Rama de produccion estable
- `develop` — Rama de integracion
- `feature/*` — Ramas de funcionalidad (nacen de `develop`, se mergean a `develop`)

### Convencion de Commits

Se utiliza [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — Nueva funcionalidad
- `fix:` — Correccion de bug
- `chore:` — Mantenimiento (configs, deps)
- `docs:` — Documentacion
- `test:` — Tests
- `refactor:` — Refactorizacion sin cambio funcional
