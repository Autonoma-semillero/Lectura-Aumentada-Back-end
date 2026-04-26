# Lectura Aumentada Backend

**Arquitectura y reglas para implementar código (humanos e IA):** consulta primero [`AGENTS.md`](./AGENTS.md). Este README describe contexto, dominio y estructura del repo; `AGENTS.md` fija capas, nombres y checklist obligatorios.

## 1. Propósito del proyecto

Este repositorio contiene la base backend de **Lectura Aumentada**, una plataforma educativa que usa WebAR para apoyar procesos de lectoescritura con el método Doman.

El backend expone una API REST en NestJS para:

- autenticación de usuarios (student, teacher, admin),
- gestión de unidades de aprendizaje y marcadores AR,
- entrega de rutas de activos (modelo 3D, audio, imagen),
- registro de progreso de estudiantes,
- soporte de sesiones para clientes móviles y web.

Este repositorio ya expone una base funcional para el MVP de Lectura Aumentada: autenticación, temáticas, tarjetas Doman, progreso general y flujo Doman de plan diario, sesiones y exposiciones.
La implementación sigue creciendo, pero ya no es solo scaffold.

## 2. Contexto de arquitectura de sistema

Flujo general:

1. App Android (Kotlin).
2. Render WebAR en WebView (A-Frame / MindAR).
3. API REST NestJS (este proyecto).
4. MongoDB como persistencia.

### 2.1 Convenciones para el equipo backend (lectura antes de implementar)

**Objetivo:** alinear el lenguaje de Jira (“temáticas”, “tarjetas”, “sesión”) con el MongoDB que versiona este repositorio y con el script canónico.

1. **“Temática” en historias** se implementa con la colección **`categories`** (`name`, `slug`, `parent_id`, `sort_order`, etc., según el script canónico). El CRUD de temáticas es CRUD sobre **`categories`**.
2. **Tarjeta ↔ temática:** relación canónica **`doman_word_cards.category_id` → `categories._id`** (referencia directa; sin colección puente dedicada a ese vínculo).
3. **Identificadores en API y logs:** el id de temática en payloads y persistencia corresponde a **`categories`** (p. ej. `categoryId`), en línea con [`lectura_aumentada_full_schema.mongosh.js`](./db/mongo/lectura_aumentada_full_schema.mongosh.js). Si el contrato público exige otro nombre o forma, documentar **ADR** y actualizar el script.
4. **Fuente de verdad del esquema:** diagrama y documentos en [`docs/origen/Arquitectura/db/`](./docs/origen/Arquitectura/db/) — en particular `Db_1.png`, `Estructura base de datos MongoDB.docx` — y el script [`db/mongo/lectura_aumentada_full_schema.mongosh.js`](./db/mongo/lectura_aumentada_full_schema.mongosh.js). Detalle Fase 1 Doman (referencia de producto): `docs/agentic/db-fase1-doman.md` *(ruta esperada en el monorepo / documentación adjunta; crear o enlazar si aún no existe en este repo)*.

Las historias **US-BE-F1-*** deben cumplirse respetando los puntos anteriores. Las **US-F1-*** (p. ej. EPIC-2) describen valor de negocio / UX u otros alcances; no sustituyen el contrato de esquema anterior salvo que explícitamente lo indiquen y se actualicen ADR + script.

**Implementación en código:** módulo [`src/modules/categories/`](./src/modules/categories/) (CRUD `/api/categories`, reorder, listado y asociación de tarjetas vía `category_id`; ver §8.6). **Cambios de esquema** (validador, índices): PR que actualice el script canónico y deje evidencia en `docs/origen/Arquitectura/db/` (p. ej. [`US-BE-F1-01-categories.md`](./docs/origen/Arquitectura/db/US-BE-F1-01-categories.md)).

## 3. Stack tecnológico

- Framework: NestJS
- Lenguaje: TypeScript
- Base de datos: MongoDB (conexión vía `mongoose`)
- Autenticación: JWT (scaffold)
- Validación: `class-validator` (preparado, reglas detalladas pendientes)
- Patrón arquitectónico: Layered + Clean-ish
- Documentación OpenAPI: Swagger (`@nestjs/swagger`), UI en `/api-docs`

## 4. Principios de arquitectura aplicados

Cada módulo sigue capas explícitas:

- `presentation`: controllers HTTP
- `application`: services/casos de uso
- `domain`: contratos, interfaces de entidad, **tokens de inyección** (`domain/constants/`), tipos opcionales (`domain/types/`)
- `infrastructure`: repositorios y schemas
- `dto`: objetos de entrada/salida para API

Reglas clave:

- Los controladores solo delegan en servicios.
- Los servicios solo usan repositorios (vía interfaz `I*Repository`).
- No hay acceso directo a DB desde controladores.
- La implementación concreta del repositorio se registra con **tokens** en el módulo Nest (`provide` / `useClass`).
- Prefijo global de la API: **`/api`**. Health: **`GET /health`** (sin prefijo). Ver detalle en [`AGENTS.md`](./AGENTS.md).

## 5. Estructura del repositorio

```text
src/
  main.ts
  app.module.ts

  config/
    env.config.ts
    database.config.ts
    jwt.config.ts

  common/
    guards/
      jwt-auth.guard.ts
    filters/
      http-exception.filter.ts
    interceptors/
      logging.interceptor.ts
    decorators/
      public.decorator.ts

  database/
    mongodb.module.ts
    mongodb.providers.ts

  modules/
    <nombre-modulo>/              # carpeta en kebab-case, ej. learning-units
      presentation/
      application/
      domain/
        constants/                # tokens DI, ej. *.tokens.ts
        interfaces/               # entidades + I*Repository
        types/                    # opcional: tipos de dominio sin comportamiento
      infrastructure/
        repositories/
        schemas/
      dto/
      <nombre-modulo>.module.ts

    # Ejemplos actuales: auth, users, learning-units, progress, assets, categories, doman
```

## 6. Estado actual del código

Actualmente está implementado:

- CRUD de temáticas sobre **`categories`** con persistencia Mongo (`src/modules/categories/`), planes/sesiones Doman con **`category_id`** (`src/modules/doman/`),
- bootstrapping NestJS (`main.ts`, `app.module.ts`),
- configuración base de entorno, Mongo y JWT,
- módulos funcionales con controladores y servicios placeholder,
- contratos de dominio por módulo,
- repositorios con métodos vacíos listos para completar,
- schemas base de Mongo para entidades principales,
- documentación OpenAPI con Swagger (`/api-docs`).

Actualmente NO está implementado:

- lógica de autenticación real,
- estrategias Passport/JWT completas,
- persistencia real (consultas Mongo),
- reglas avanzadas de validación DTO,
- casos de uso de negocio (permisos por rol, métricas, etc.).

## 7. Modelo de datos MongoDB (canónico)

El esquema de base de datos vive en el script **`db/mongo/lectura_aumentada_full_schema.mongosh.js`**. Aplicación recomendada:

```bash
mongosh "mongodb://localhost:27017/lectura_aumentada_db" --file db/mongo/lectura_aumentada_full_schema.mongosh.js
```

Los **schemas Mongoose** en `src/modules/*/infrastructure/schemas/` y `src/database/doman.schemas.ts` deben mantenerse alineados a ese script (nombres de colección y campos en inglés, como en el validador `$jsonSchema`).

### 7.1 Núcleo (AR / producto)

| Colección | Rol breve |
|-----------|-----------|
| `users` | Cuenta: `email`, `display_name`, `roles[]`, `status`, `password_hash`, `metadata`, timestamps. |
| `categories` | **Temática** en el modelo del repo: `name`, `slug` (único global, `ux_categories_slug`), `parent_id`, `sort_order`, timestamps; índice `ix_categories_parent_sort` para listados por padre + orden. |
| `learning_units` | Unidad AR: `word`, `marker_id`, `category_id?`, `assets.model_3d`, `assets.audio_pronunciacion`, `metadata_accessibility`, `language`, timestamps. **No hay colección `assets`.** |
| `sessions` | Sesión de producto / experiencia AR (`session_type`, `started_at`, `status`, etc.). **No** es la tabla de refresh JWT; auth real debe definir su propia persistencia. |
| `progress_logs` | Eventos: `user_id`, `action`, `ts`, `payload`, `learning_unit_id?`, `session_id?`, `device`, `created_at`. |

Relaciones conceptuales:

- un `user` genera muchos `progress_logs` (vía `user_id`);
- un `progress_log` puede referenciar `learning_unit_id` y `session_id`;
- `learning_units` puede enlazar a `categories` por `category_id`;
- `sessions` enlaza `user_id` y opcionalmente `learning_unit_id` / `marker_id`.
- **Tarjeta Doman ↔ temática:** `doman_word_cards.category_id` referencia `categories` (sin colección puente). Lo mismo aplica donde el canónico usa `category_id` en planes/sesiones Doman.

### 7.2 Fase 1 Doman (aditiva)

| Colección |
|-----------|
| `doman_word_cards` |
| `doman_daily_plans` |
| `doman_sessions` |
| `doman_session_cards` |
| `doman_exposure_logs` |

Referencias de diseño citadas en el script: `docs/arquitectura/DB/Db_1.png`, `docs/agentic/db-fase1-doman.md`. Los tipos Mongoose de referencia siguen en **`src/database/doman.schemas.ts`** para modelos aún no cubiertos por repositorios. Planes y sesiones Doman con **`category_id`** persistido: módulo **`src/modules/doman/`** (ver §8.7). Tarjetas y temáticas: **`src/modules/categories/`** (`doman_word_cards.category_id` → `categories`).

### 7.3 Activos binarios

- Mongo guarda solo metadatos y URLs.
- Archivos binarios (3D, audio, imagen) deben vivir en Nginx, servidor de archivos o CDN.

## 8. Descripción de módulos

### 8.1 Auth

Responsable de login, refresh, logout y control de sesiones.

Archivos relevantes (todos bajo `src/modules/auth/`):

- `presentation/auth.controller.ts`
- `application/auth.service.ts`
- `domain/constants/auth.tokens.ts`
- `domain/interfaces/auth.repository.interface.ts`
- `domain/types/auth.types.ts` (si aplica)
- `infrastructure/repositories/auth.repository.ts`
- `infrastructure/schemas/session.schema.ts`
- `dto/*.dto.ts`

### 8.2 Users

Responsable de gestión de usuarios y roles del sistema.

Archivos relevantes (`src/modules/users/`):

- `presentation/users.controller.ts`
- `application/users.service.ts`
- `domain/constants/users.tokens.ts`
- `domain/interfaces/user.interface.ts`
- `domain/interfaces/users.repository.interface.ts`
- `infrastructure/repositories/users.repository.ts`
- `infrastructure/schemas/user.schema.ts`
- `dto/*.dto.ts`

### 8.3 Learning Units

Responsable de unidades pedagógicas, marcadores y contenido asociado.

Archivos relevantes (`src/modules/learning-units/`):

- `presentation/learning-units.controller.ts`
- `application/learning-units.service.ts`
- `domain/constants/learning-units.tokens.ts`
- `domain/interfaces/learning-unit.interface.ts`
- `domain/interfaces/learning-units.repository.interface.ts`
- `infrastructure/repositories/learning-units.repository.ts`
- `infrastructure/schemas/learning-unit.schema.ts`
- `dto/*.dto.ts`

### 8.4 Progress

Responsable del tracking de interacciones de aprendizaje.

Archivos relevantes (`src/modules/progress/`):

- `presentation/progress.controller.ts`
- `application/progress.service.ts`
- `domain/constants/progress.tokens.ts`
- `domain/interfaces/progress-log.interface.ts`
- `domain/interfaces/progress.repository.interface.ts`
- `infrastructure/repositories/progress.repository.ts`
- `infrastructure/schemas/progress-log.schema.ts`
- `dto/*.dto.ts`

### 8.5 Assets

Responsable de exponer metadata y rutas de activos AR como **vista de lectura** sobre `learning_units` (no hay colección `assets` en MongoDB).

Archivos relevantes (`src/modules/assets/`):

- `presentation/assets.controller.ts`
- `application/assets.service.ts`
- `domain/constants/assets.tokens.ts`
- `domain/interfaces/asset.interface.ts`
- `domain/interfaces/assets.repository.interface.ts`
- `infrastructure/repositories/assets.repository.ts`
- `infrastructure/schemas/asset.schema.ts` (subdocumento embebido `assets`, referencia)
- `dto/*.dto.ts`

### 8.6 Categories (temáticas)

En este repositorio **temática = `categories`** (véase README §2.1). CRUD bajo `/api/categories` (incluye `POST /api/categories/reorder` por `sort_order` entre hermanos). Slug único a nivel de colección (índice `ux_categories_slug`). Evidencia de esquema: [`docs/origen/Arquitectura/db/US-BE-F1-01-categories.md`](./docs/origen/Arquitectura/db/US-BE-F1-01-categories.md). Asociación tarjeta–temática (`category_id`): [`docs/origen/Arquitectura/db/US-BE-F1-02-doman-word-cards-category.md`](./docs/origen/Arquitectura/db/US-BE-F1-02-doman-word-cards-category.md). Tarjetas palabra + audio (`doman_word_cards`): [`docs/origen/Arquitectura/db/US-BE-F1-03-doman-word-cards.md`](./docs/origen/Arquitectura/db/US-BE-F1-03-doman-word-cards.md).

**Tarjetas Doman:** `POST /api/word-cards` (alta con `word`, `audio_url`, **`category_id` obligatorio**, `student_id`, opcionales `language`, `learning_unit_id`, `status`). **`PATCH /api/word-cards/:id`** (edición parcial). **`GET /api/word-cards?student_id=`** (listado por estudiante; **`category_id`** query opcional para filtrar por temática e índice `ix_word_cards_student_category`). `GET /api/categories/:categoryId/word-cards`. **`GET /api/word-cards/:id`**. **`PATCH /api/word-cards/:id/category`** solo cambia temática (`category_id` obligatorio, no se permite vacío). La palabra se **normaliza** (trim, espacios, minúsculas) antes de guardar; unicidad **`ux_word_cards_student_word`** (`student_id` + `word`).

Archivos relevantes (`src/modules/categories/`):

- `presentation/categories.controller.ts`
- `presentation/category-word-cards.controller.ts`
- `presentation/word-cards.controller.ts`
- `application/categories.service.ts`
- `application/word-cards.service.ts`
- `application/word-normalize.ts`
- `domain/constants/categories.tokens.ts`
- `domain/interfaces/category.interface.ts`
- `domain/interfaces/categories.repository.interface.ts`
- `domain/interfaces/word-cards.repository.interface.ts`
- `domain/types/word-card-repository.payloads.ts`
- `infrastructure/repositories/categories.repository.ts`
- `infrastructure/repositories/word-cards.repository.ts`
- `infrastructure/schemas/category.schema.ts`
- `dto/*.dto.ts`

### 8.7 Doman — planes diarios y sesiones (`doman_daily_plans`, `doman_sessions`)

Temática activa de la jornada / sesión: **`category_id`** → `categories._id`, mismo criterio que **`doman_word_cards.category_id`** (README §2.1). Evidencia: [`docs/origen/Arquitectura/db/US-BE-F1-04-doman-plan-session-category.md`](./docs/origen/Arquitectura/db/US-BE-F1-04-doman-plan-session-category.md).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/doman-daily-plans` | Crea plan (`student_id`, `plan_date`, targets, **`category_id`** obligatorio) |
| GET | `/api/doman-daily-plans` | Lista por `student_id` + rango `from` / `to` (ISO fecha, UTC); por defecto ~60 días hasta hoy |
| GET | `/api/doman-daily-plans/:id` | Detalle (incluye `category_id`) |
| PATCH | `/api/doman-daily-plans/:id` | Actualización parcial (puede cambiar `category_id`) |
| POST | `/api/doman-sessions` | Crea sesión; **`category_id` debe coincidir** con el plan diario |
| GET | `/api/doman-sessions` | Lista por `daily_plan_id` |
| GET | `/api/doman-sessions/:id` | Detalle |
| PATCH | `/api/doman-sessions/:id` | Parcial; si se envía `category_id`, debe seguir coincidiendo con el plan |

**Temáticas con tarjetas para un estudiante:** `GET /api/categories/with-available-word-cards?student_id=` — devuelve categorías que tienen al menos una `doman_word_card` de ese estudiante en esa temática, con `available_word_cards_count` (mismo filtro que agregación por `student_id` + `category_id`).

Archivos (`src/modules/doman/`): `doman.module.ts`, `presentation/daily-plans.controller.ts`, `presentation/doman-sessions.controller.ts`, `application/*.service.ts`, `application/plan-date.util.ts`, `infrastructure/repositories/*.ts`, `domain/**`, `dto/*.dto.ts`.

## 9. Configuración de entorno

Variables mínimas recomendadas:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/lectura_aumentada_db
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
```

Archivos de configuración:

- `src/config/env.config.ts`
- `src/config/database.config.ts`
- `src/config/jwt.config.ts`

## 10. Ejecución local

Instalar dependencias:

```bash
npm install
```

Levantar en modo desarrollo:

```bash
npm run start:dev
```

Compilar:

```bash
npm run build
```

### 10.1 Despliegue en Vercel

Este backend queda preparado para ejecutarse como función serverless de Vercel:

- Entry serverless: `api/[...all].ts` (inicializa NestJS una vez por instancia y reutiliza handler).
- Configuración Vercel: `vercel.json`.
- Rewrites incluidos:
  - `/health` -> `/api/health`
  - `/api-docs` -> `/api/api-docs`

Pasos:

1. Crear proyecto en Vercel apuntando a este repositorio.
2. Framework preset: **Other**.
3. Build command: `npm run vercel-build` (o `npm run build`).
4. Install command: `npm install`.
5. Definir variables de entorno en Vercel (mínimo):
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `NODE_ENV=production`
6. Deploy.

Endpoints esperados tras deploy:

- API: `https://<tu-dominio>/api/*`
- Health: `https://<tu-dominio>/health`
- Swagger: `https://<tu-dominio>/api-docs`

## 11. Convenciones para desarrollo humano e IA

Estas reglas deben respetarse al extender el proyecto:

1. No mezclar responsabilidades entre capas.
2. No saltar `service` desde `controller`.
3. No acoplar `domain` con detalles de infraestructura (sin Mongoose ni DTOs en `domain/`).
4. Mantener contratos (`interfaces`) estables y explícitos.
5. Agregar validaciones en DTO (`class-validator`) sin mover lógica de negocio a controladores.
6. Implementar queries únicamente en repositorios; inyectar `MONGO_CONNECTION` solo ahí.
7. Mantener nombres de campos de dominio alineados con el modelo de datos objetivo.
8. Documentar decisiones no triviales en comentarios cortos y precisos.
9. Cada módulo define tokens en `domain/constants/*.tokens.ts` y registra `{ provide: TOKEN, useClass: Repository }`.
10. En servicios, la dependencia del repositorio se nombra `{modulo}Repository` (ej. `usersRepository`), nunca solo `repository`.
11. Mapear DTO a entidad de dominio en el **servicio** con helpers explícitos; evitar casts opacos `as unknown as`.
12. Propiedades de API visibles en Swagger: `@ApiProperty` / `@ApiPropertyOptional` en DTOs; `@ApiTags` en controllers.

**Norma de oro:** si la tarea no encaja en el flujo Controller → Service → `I*Repository`, replantear antes de codificar. Detalle: [`AGENTS.md`](./AGENTS.md).

## 12. Guía para futuras actualizaciones

### 12.1 Implementar lógica de negocio

Orden sugerido:

1. Completar repositorios por módulo (Mongo real).
2. Completar servicios con casos de uso.
3. Aplicar validaciones DTO con `class-validator`.
4. Endurecer auth (hashing, JWT guard real, refresh flow).
5. Añadir pruebas unitarias e integración.

### 12.2 Al agregar un módulo nuevo

Crear siempre:

- `presentation/*.controller.ts`
- `application/*.service.ts`
- `domain/constants/*.tokens.ts` (token del repositorio)
- `domain/interfaces/*` (entidad + `I*Repository`)
- `infrastructure/repositories/*`
- `infrastructure/schemas/*`
- `dto/*`
- `*.module.ts`

Opcional: `domain/types/*` si el dominio necesita tipos auxiliares sin mezclar con interfaces de persistencia.

Registrar el módulo en `app.module.ts`. Checklist paso a paso: [`AGENTS.md`](./AGENTS.md) sección 2 y 11.

### 12.3 Cambios de esquema Mongo

Cuando se modifiquen campos:

- actualizar `domain interfaces`,
- actualizar `dto`,
- actualizar `schemas`,
- ajustar repositorios y servicios,
- documentar impacto en este README.

## 13. Riesgos técnicos actuales

- Guard JWT es placeholder (permite acceso).
- No hay manejo fino de errores de negocio.
- No hay transacciones ni estrategia de consistencia eventual definidas.
- No hay versionado de API (URL o header); el contrato se documenta en Swagger en `/api-docs`.

## 14. Próximos pasos recomendados

1. Endpoints de auth con estrategia JWT real y uso coherente de `@Public()` donde aplique.
2. Implementación real de repositorios Mongo.
3. Endurecer validación DTO (`class-validator`) y respuestas de error homogéneas.
4. Pruebas unitarias por módulo.
5. Observabilidad mínima (logs estructurados + request id).

---

Este documento define el contexto del proyecto. Las **reglas ejecutables** para que humanos e IA no diverjan en arquitectura están en [`AGENTS.md`](./AGENTS.md) y en `.cursor/rules/lectura-aumentada-architecture.mdc`.

