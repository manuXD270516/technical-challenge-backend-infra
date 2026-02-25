#!/bin/bash
# =============================================================================
# VibePeak API Gateway - Gitflow Initialization Script
# =============================================================================
# Este script inicializa el repositorio Git con gitflow y crea commits
# convencionales para cada feature del proyecto.
#
# Uso: bash scripts/init-gitflow.sh
# =============================================================================

set -e

echo "============================================"
echo "  VibePeak API Gateway - Gitflow Init"
echo "============================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "ERROR: Ejecutar desde la raiz del proyecto"
  exit 1
fi

# -----------------------------------------------------------------------------
# 1. Inicializar repositorio
# -----------------------------------------------------------------------------
echo ">>> Inicializando repositorio Git..."
git init
git checkout -b main

# Commit inicial
git add .gitignore
git commit -m "$(cat <<'EOF'
chore: initial project setup with .gitignore

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 2. Crear rama develop
# -----------------------------------------------------------------------------
git checkout -b develop

# -----------------------------------------------------------------------------
# 3. Feature: project-setup (configs base)
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: project-setup"
git checkout -b feature/project-setup

git add package.json tsconfig.json .eslintrc.json jest.config.ts .env.example .dockerignore
git commit -m "$(cat <<'EOF'
chore: add project configuration files

- package.json with Express, pg, TypeScript dependencies
- tsconfig.json with strict TypeScript configuration
- ESLint config with TypeScript plugin
- Jest configuration with ts-jest preset
- Environment variables template (.env.example)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/project-setup -m "$(cat <<'EOF'
merge: feature/project-setup into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 4. Feature: docker
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: docker"
git checkout -b feature/docker

git add Dockerfile docker-compose.yml
git commit -m "$(cat <<'EOF'
feat: add Docker and docker-compose configuration

- Multi-stage Dockerfile (builder + runtime) with non-root user
- docker-compose.yml with PostgreSQL 16 and API service
- Health checks for both services
- Persistent volume for PostgreSQL data

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/docker -m "$(cat <<'EOF'
merge: feature/docker into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 5. Feature: database
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: database"
git checkout -b feature/database

git add src/config/ src/types/ src/db/
git commit -m "$(cat <<'EOF'
feat: add database layer with migrations and seed data

- PostgreSQL connection pool with configurable settings
- Migration system tracking executed migrations in _migrations table
- Schema: users (SHA-256 key hash, plan, credits), jobs, idempotency_keys
- Seed script with 3 test users (basic, pro, no-credits)
- Centralized config module and TypeScript type definitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/database -m "$(cat <<'EOF'
merge: feature/database into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 6. Feature: auth-middleware
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: auth-middleware"
git checkout -b feature/auth-middleware

git add src/middleware/auth.ts src/middleware/errorHandler.ts
git commit -m "$(cat <<'EOF'
feat: implement authentication and error handling middleware

- Bearer token authentication with SHA-256 hash lookup
- Structured error handling with AppError class
- Consistent error response format with code and message
- Support for 401, 402, 404, 429, 503 status codes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/auth-middleware -m "$(cat <<'EOF'
merge: feature/auth-middleware into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 7. Feature: ssrf-prevention
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: ssrf-prevention"
git checkout -b feature/ssrf-prevention

git add src/validators/
git commit -m "$(cat <<'EOF'
feat: implement URL validation with SSRF prevention

- Block private IP ranges: RFC 1918, loopback, link-local, CGNAT
- IPv6 private range detection (::1, fe80:, fc/fd)
- DNS resolution check to prevent DNS rebinding
- Configurable HTTPS enforcement for webhook URLs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/ssrf-prevention -m "$(cat <<'EOF'
merge: feature/ssrf-prevention into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 8. Feature: idempotency
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: idempotency"
git checkout -b feature/idempotency

git add src/middleware/idempotency.ts
git commit -m "$(cat <<'EOF'
feat: implement idempotency middleware

- Cache responses by Idempotency-Key header per user
- 24-hour TTL for cached responses
- Intercepts response to store status code and body
- Transparent to route handlers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/idempotency -m "$(cat <<'EOF'
merge: feature/idempotency into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 9. Feature: core-services
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: core-services"
git checkout -b feature/core-services

git add src/services/
git commit -m "$(cat <<'EOF'
feat: implement credit, processing dispatch, and webhook services

- Credit service: atomic deduction with WHERE credits > 0, refund on failure
- Processing service: HTTP dispatch to configurable endpoint with timeout
- Webhook delivery: HMAC-SHA256 signing, exponential backoff retry (3 attempts)
- Mock processor: 3-5s random delay, ~20% simulated failure rate

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/core-services -m "$(cat <<'EOF'
merge: feature/core-services into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 10. Feature: api-routes
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: api-routes"
git checkout -b feature/api-routes

git add src/routes/ src/app.ts src/server.ts
git commit -m "$(cat <<'EOF'
feat: implement API routes and Express application

- POST /v1/jobs: create job with validation, credits, concurrency check
- GET /v1/jobs/:id: retrieve job status with ownership validation
- POST /internal/callback: handle processing service callbacks
- POST /mock/process: mock processing endpoint for development
- GET /health: health check endpoint
- Graceful shutdown with SIGTERM/SIGINT handling

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/api-routes -m "$(cat <<'EOF'
merge: feature/api-routes into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 11. Feature: tests
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: tests"
git checkout -b feature/tests

git add tests/
git commit -m "$(cat <<'EOF'
test: add unit tests for all critical paths

- URL validator: private IP detection (IPv4/IPv6 ranges)
- Auth middleware: token extraction, hash verification, user lookup
- Idempotency: cache hit/miss, TTL expiration
- Error handler: AppError mapping, unknown error fallback
- Credits service: deduction, refund, active job counting
- Webhook: HMAC-SHA256 signing, payload structure
- Jobs route: ID generation, response formatting per status
- Mock processor: delay range, failure rate, callback payloads

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/tests -m "$(cat <<'EOF'
merge: feature/tests into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 12. Feature: documentation
# -----------------------------------------------------------------------------
echo ""
echo ">>> Feature: documentation"
git checkout -b feature/documentation

git add README.md scripts/
git commit -m "$(cat <<'EOF'
docs: add README with architecture, usage, and API reference

- Architecture diagram showing component interactions
- Design decisions and technology choices
- Quick start guide (Docker and local development)
- API endpoint reference with request/response examples
- Test user credentials for development
- Error code reference table
- Gitflow workflow documentation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git checkout develop
git merge --no-ff feature/documentation -m "$(cat <<'EOF'
merge: feature/documentation into develop

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# -----------------------------------------------------------------------------
# 13. Merge develop into main (release)
# -----------------------------------------------------------------------------
echo ""
echo ">>> Merging develop into main (release v1.0.0)"
git checkout main
git merge --no-ff develop -m "$(cat <<'EOF'
release: v1.0.0 - VibePeak API Gateway

Complete implementation of the VibePeak API Gateway including:
- Bearer token authentication with SHA-256 hashed API keys
- SSRF prevention on image and webhook URLs
- Credit system with atomic deduction and refund on failure
- Idempotency support via Idempotency-Key header
- Plan-based concurrency limits (basic: 1, pro: 5)
- Mock processing service with configurable delay and failure rate
- Webhook delivery with HMAC-SHA256 signing and exponential backoff
- Job ownership validation (returns 404 for unauthorized access)
- PostgreSQL with migrations and seed data
- Docker and docker-compose configuration
- Comprehensive unit test suite
- Full API documentation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

git tag -a v1.0.0 -m "Release v1.0.0 - VibePeak API Gateway"

# -----------------------------------------------------------------------------
# Resultado final
# -----------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  Gitflow inicializado exitosamente!"
echo "============================================"
echo ""
echo "Branches creadas:"
git branch -a
echo ""
echo "Historial de commits:"
git log --oneline --graph --all | head -40
echo ""
echo "Tag:"
git tag -l
echo ""
echo "Branch actual: $(git branch --show-current)"
