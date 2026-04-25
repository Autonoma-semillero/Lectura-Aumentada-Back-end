# US-BE-F1-03 — Tarjetas Doman palabra + audio (`doman_word_cards`)

**Sprint 1.** Persistir tarjetas con **palabra**, **audio** (`audio_url`), **`category_id`** y resto de campos alineados al validador e índices del script canónico.

## Objetivo

- **Mongo:** colección `doman_word_cards` según [`lectura_aumentada_full_schema.mongosh.js`](../../../../db/mongo/lectura_aumentada_full_schema.mongosh.js) (`$jsonSchema`, índices `ix_word_cards_*`, `ux_word_cards_student_word`, etc.).
- **API:** alta, edición parcial y listado; **`word`** normalizada antes de persistir; **`audio_url`** en alta/edición; **`category_id` obligatorio** en alta y en el flujo de producto orientado a sesión por temática (no se permite quitar temática vía `PATCH …/category` vacío).

## Normalización de `word`

- `trim`, colapso de espacios internos, **NFC** y **`toLocaleLowerCase('es')`**.
- El valor almacenado es el normalizado; **`initial_letter`** se deriva de la primera unidad Unicode (mayúsculas según `es`).
- La unicidad **`ux_word_cards_student_word`** aplica sobre ese valor (`student_id` + `word`). Conflicto Mongo **11000** → `409 Conflict` con mensaje explícito.

## API implementada

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/word-cards` | Alta (`student_id`, `word`, `audio_url`, **`category_id`**, opcionales `language`, `learning_unit_id`, `status`) |
| PATCH | `/api/word-cards/:id` | Edición parcial (mínimo un campo); misma normalización de `word` si se envía |
| GET | `/api/word-cards` | `student_id` obligatorio; `category_id` opcional (filtra por temática) |
| GET | `/api/word-cards/:id` | Detalle |
| PATCH | `/api/word-cards/:id/category` | Solo cambio de `category_id` (ObjectId válido de `categories`) |
| GET | `/api/categories/:categoryId/word-cards` | Listado por temática |

Código: `src/modules/categories/` (`word-cards.service.ts`, `word-normalize.ts`, `word-cards.repository.ts`, DTOs `create-` / `update-word-card`).

Relación temática: [US-BE-F1-02-doman-word-cards-category.md](./US-BE-F1-02-doman-word-cards-category.md).

## Aceptación cumplida

- [x] Endpoints alta / edición / listado.
- [x] Normalización de `word` y respeto de **`ux_word_cards_student_word`**.
- [x] `audio_url` en modelo y API.
- [x] Validador e índices documentados en script canónico (sin duplicar aquí el JSON completo).
- [x] `category_id` obligatorio en **POST** y no desasociable por cadena vacía en **`PATCH …/category`** (sesiones por temática).

**Fecha de referencia (última alineación documentada):** 2026-04-24.
