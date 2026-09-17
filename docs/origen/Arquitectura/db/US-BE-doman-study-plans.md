# Planes de estudio Doman configurables

## Objetivo

Separar la configuración pedagógica de largo plazo de la ejecución diaria. Un
docente crea un plan con nombre y duración, lo asigna a un estudiante y define
qué tarjetas se utilizarán en cada nivel y rango de fechas. Los planes diarios
y sus sesiones siguen siendo la unidad ejecutable consumida por la app móvil.

## Colección `doman_study_plans`

Cada documento contiene:

- `name`, `description`, `student_id`, `start_date` y `end_date`.
- Valores predeterminados de ejecución: `sessions_per_day` (5 por omisión),
  `display_ms`, `audio_mode` y `mode`.
- Estado `draft`, `active`, `paused`, `completed` o `archived`.
- `levels`, ordenados y sin solapamientos. Cada nivel tiene su propio rango de
  fechas y una lista de categorías con los `word_card_ids` elegidos.
- Auditoría mediante `created_by`, `created_at` y `updated_at`.

Solo se permite un plan activo para un estudiante en un rango de fechas
solapado. Esta regla se valida en la capa de aplicación; el índice
`ix_study_plan_student_status_dates` soporta la consulta.

## Materialización diaria

`doman_daily_plans` conserva su función de calendario ejecutable y ahora puede
referenciar el origen con `study_plan_id` y `study_plan_level_id`. Al preparar
un día, el servicio localiza el nivel vigente, genera un plan diario por cada
categoría del nivel y crea las sesiones usando únicamente las tarjetas
seleccionadas.

La app móvil mantiene compatibilidad con el flujo existente: si existe un plan
activo para el estudiante y la fecha, la generación diaria adopta de forma
automática sus sesiones, tiempo y selección de tarjetas.
`GET /api/doman/study-plans/active` publica al estudiante únicamente las
categorías del nivel vigente; si no hay un plan activo, el móvil conserva el
catálogo anterior como alternativa compatible.

## Gestión y restauración de sesiones

El administrador puede añadir hasta 10 sesiones a un plan diario, eliminar una
sesión o todas las sesiones del día y restaurarlas individualmente o por día.
Restaurar devuelve la sesión a `planned` y limpia las marcas operativas de
inicio, finalización, visualización y audio. Los logs históricos de exposición
se conservan al restaurar para no falsear el progreso acumulado; se eliminan
cuando la sesión se borra explícitamente.

## Fuente canónica

El validador y los índices están en
`db/mongo/lectura_aumentada_full_schema.mongosh.js`. El módulo Nest vive en
`src/modules/doman/` y respeta controller → service → repositorio de dominio →
MongoDB.
