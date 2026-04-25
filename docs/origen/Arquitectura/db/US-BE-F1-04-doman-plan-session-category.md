# US-BE-F1-04 — Temática elegida en plan y sesión Doman (`category_id`)

**Sprint 1.** Persistir la temática activa en **`doman_daily_plans.category_id`** y **`doman_sessions.category_id`**, alineada al README **§2.1** y al script canónico.

## Objetivo

- **Mongo:** campos `category_id` en `doman_daily_plans` y `doman_sessions` (validador en [`lectura_aumentada_full_schema.mongosh.js`](../../../../db/mongo/lectura_aumentada_full_schema.mongosh.js)).
- **API:** alta, lectura, listado y edición devolviendo / persistiendo **`category_id`**.
- **Listado de temáticas con material disponible:** categorías donde el estudiante tiene al menos una tarjeta en `doman_word_cards` con ese **`category_id`** (mismo criterio que filtrar tarjetas por estudiante + temática).

## Regla de coherencia (aceptación)

El **`category_id`** del plan y de la sesión es el **mismo identificador** que en **`doman_word_cards.category_id`**: selección de tarjetas por **`student_id`** + **`category_id`**.

En implementación:

- Alta de **sesión**: `category_id` del body debe **coincidir** con el del plan diario referenciado (`daily_plan_id`).
- **PATCH sesión**: si se envía `category_id`, debe seguir coincidiendo con el plan.

## API implementada

### Planes diarios (`/api/doman-daily-plans`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/doman-daily-plans` | Crea plan con **`category_id`** obligatorio |
| GET | `/api/doman-daily-plans` | `student_id`, `from` / `to` opcionales (fechas ISO, día UTC) |
| GET | `/api/doman-daily-plans/:id` | Detalle |
| PATCH | `/api/doman-daily-plans/:id` | Parcial (`category_id`, targets, notas, etc.) |

### Sesiones (`/api/doman-sessions`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/doman-sessions` | Crea sesión; valida plan, `student_id` y **`category_id` = plan.category_id** |
| GET | `/api/doman-sessions` | `daily_plan_id` obligatorio |
| GET | `/api/doman-sessions/:id` | Detalle |
| PATCH | `/api/doman-sessions/:id` | Parcial con regla de **`category_id`** vs plan |

### Categorías con tarjetas del estudiante

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categories/with-available-word-cards?student_id=` | Lista `categories` con **`available_word_cards_count`** (agregación sobre `doman_word_cards`) |

Código: `src/modules/doman/`, extensiones en `src/modules/categories/` (endpoint anterior + `WordCardsRepository.countWordCardsByCategoryForStudent`, `CategoriesRepository.findByIds`).

## Aceptación cumplida

- [x] Endpoints persisten y devuelven `category_id` en plan y sesión.
- [x] Listado de `categories` con tarjetas disponibles por estudiante (mismo criterio que filtro de tarjetas).
- [x] `category_id` de plan/sesión alineado al criterio de `doman_word_cards`.

**Fecha de referencia (última alineación documentada):** 2026-04-24.
