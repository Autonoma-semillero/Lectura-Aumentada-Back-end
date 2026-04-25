# US-BE-F1-02 — Asociación tarjeta–temática (`doman_word_cards.category_id`)

**Sprint 1.** Cada tarjeta Doman queda asociada a su temática **solo** mediante `category_id` → `categories._id` (sin colección puente).

## Objetivo

- **Mongo:** campo `category_id` en `doman_word_cards`; índice compuesto para listados por estudiante y temática.
- **API:** lectura y escritura de `category_id`; listado filtrado por `student_id` y `category_id`; al asignar categoría no nula, integridad referencial comprobando que exista en `categories`.

## Evidencia de esquema (canónico)

- Archivo: [`db/mongo/lectura_aumentada_full_schema.mongosh.js`](../../../../db/mongo/lectura_aumentada_full_schema.mongosh.js)

Índice de aceptación:

- `ix_word_cards_student_category` — `{ student_id: 1, category_id: 1 }` (soporta `GET /api/word-cards?student_id=&category_id=`).

El validador JSON Schema de `doman_word_cards` declara `category_id` como `objectId` **opcional** (no está en `required`; ausencia o `$unset` = sin temática asignada).

## API implementada

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/word-cards` | Lista por **`student_id`**; **`category_id`** query opcional (si viene, valida categoría y filtra; ver US-BE-F1-03) |
| GET | `/api/word-cards/:id` | Detalle de tarjeta (incluye `category_id` si está asignado) |
| PATCH | `/api/word-cards/:id/category` | Cambia solo `category_id` (ObjectId obligatorio; no se permite vacío — sesión por temática; ver US-BE-F1-03) |
| GET | `/api/categories/:categoryId/word-cards` | Lista todas las tarjetas con esa `category_id` (sin filtro por estudiante) |

Código: `src/modules/categories/` (`WordCardsService`, `WordCardsRepository`, controladores `word-cards` y `category-word-cards`).

Contexto temáticas (CRUD `categories`): [US-BE-F1-01-categories.md](./US-BE-F1-01-categories.md).

## Aceptación cumplida

- [x] API lee/escribe `category_id` en `doman_word_cards`.
- [x] Listado por `student_id` + `category_id`.
- [x] Integridad referencial con `categories` al asignar `category_id` no nulo.
- [x] Índice `ix_word_cards_student_category` en script canónico.
- [x] Vínculo tarjeta–temática **solo** vía `category_id` (sin `theme_card_links` ni equivalente).

**Fecha de referencia (última alineación documentada):** 2026-04-24.
