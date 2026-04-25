# US-BE-F1-01 — API CRUD de temáticas (`categories`)

**Sprint 1.** Temática = colección **`categories`**, alineada al README **§2.1 (convenciones equipo backend)** y al script canónico Mongo.

## Objetivo

- **Mongo:** colección `categories` con validador e índices definidos en el script canónico.
- **API:** CRUD REST bajo `/api/categories`, validación de **`slug` único** (coherente con `ux_categories_slug`), soporte de **`parent_id`** (jerarquía) y **`sort_order`** (orden entre hermanos + `POST …/reorder`).

## Evidencia de esquema (canónico)

Fuente única de verdad del validador e índices:

- Archivo: [`db/mongo/lectura_aumentada_full_schema.mongosh.js`](../../../../db/mongo/lectura_aumentada_full_schema.mongosh.js)

Fragmento relevante (referencia; el archivo prevalece):

- `ensureCollection('categories', { $jsonSchema: { … } })`
- Índices:
  - `ux_categories_slug` — `{ slug: 1 }` **unique**
  - `ix_categories_parent` — `{ parent_id: 1 }`
  - `ix_categories_parent_sort` — `{ parent_id: 1, sort_order: 1 }` (listado ordenado por ámbito de padre)

## API implementada

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categories` | Lista; query opcional `parent_id` (omitir = solo raíz) |
| GET | `/api/categories/:id` | Detalle |
| POST | `/api/categories` | Crear (`name`, `slug`, `description?`, `parent_id?`, `sort_order?`) |
| PATCH | `/api/categories/:id` | Actualizar |
| DELETE | `/api/categories/:id` | Eliminar (bloqueado si hay referencias entrantes) |
| POST | `/api/categories/reorder` | Persistir orden entre hermanos (`parent_id?`, `ordered_ids[]`) |

Código: `src/modules/categories/`.

### Validación `slug` único

- En aplicación: comprobación previa a create/update + normalización (`trim`, minúsculas).
- En base de datos: índice único `ux_categories_slug` (error 11000 capturado como `ConflictException` donde aplique).

### `parent_id` y `sort_order`

- `parent_id` opcional en creación/actualización; referencia a otra categoría (validación de existencia al asignar).
- `sort_order` numérico; si no se envía en create, se asigna al final del grupo de hermanos.
- Reordenación explícita vía `POST /api/categories/reorder` con la lista completa de ids hermanos.

## Aceptación cumplida

- [x] Mongo: colección `categories` en script canónico.
- [x] API: CRUD + reorder.
- [x] `slug` único (`ux_categories_slug` + lógica en servicio).
- [x] `sort_order` / `parent_id` según modelo.
- [x] Evidencia en `docs/origen/Arquitectura/db/` (este archivo) vinculada al script canónico.

**Fecha de referencia (última alineación documentada):** 2026-04-24.
