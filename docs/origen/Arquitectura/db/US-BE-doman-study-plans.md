# Planes de estudio Doman con audiencia

## Objetivo

Separar la configuración pedagógica de largo plazo de la ejecución diaria. Un
docente crea un plan lógico para una audiencia compuesta por grupos, estudiantes
directos o ambos. Los planes diarios, las sesiones y el progreso continúan siendo
independientes por estudiante.

## Fotografía de audiencia

Los documentos v2 de `doman_study_plans` guardan:

- `schema_version: 2`.
- `group_ids`: grupos seleccionados al crear el plan.
- `direct_student_ids`: estudiantes seleccionados explícitamente.
- `student_ids`: unión deduplicada de grupos y selección directa.
- `students`: cada estudiante y sus fuentes `direct` y/o `group`.

La membresía se resuelve una sola vez al crear el plan. Añadir o retirar miembros
de un grupo después no modifica su fotografía histórica. La audiencia admite
como máximo 50 estudiantes únicos y no puede modificarse mediante `PATCH`.

El campo legacy `student_id` se acepta únicamente como shorthand deprecado para
crear una audiencia singleton. El repositorio también puede leer documentos
anteriores y sintetiza para ellos las cuatro propiedades de audiencia. Para no
romper consumidores antiguos, la respuesta también sintetiza `student_id` cuando
un plan v2 contiene exactamente un estudiante directo y ningún grupo; el campo
no se persiste en los documentos nuevos.

## Configuración y selección de tarjetas

Cada plan contiene nombre, descripción, fechas, configuración de sesiones,
estado y niveles sin solapamientos. Una categoría v2 se representa mediante:

```json
{
  "category_id": "ObjectId",
  "target_cards_count": 5
}
```

También puede fijar palabras explícitas, que se resuelven de forma independiente
contra el catálogo de cada estudiante al generar el día:

```json
{
  "category_id": "ObjectId",
  "word_card_words": ["gato", "perro"]
}
```

`target_cards_count`, `word_card_words` y el campo legacy `word_card_ids` son
modos mutuamente excluyentes.

Las tarjetas no se comparten entre estudiantes: al generar un día, el backend
busca las tarjetas elegibles del alumno y la categoría, prioriza estados `new`,
`active` y después `completed`, y limita el resultado a
`target_cards_count`.

Para lectura compatible, una categoría legacy puede conservar
`word_card_ids`. En ese caso se respeta la selección exacta y se filtran tarjetas
que no pertenezcan al estudiante, a la categoría o que estén archivadas. Los
nuevos planes de audiencia usan la regla dinámica.

## Solapamientos y propiedad

Un plan activo no puede solaparse con otro plan activo para ninguno de los
estudiantes resueltos. El índice `ix_study_plan_audience_status_dates` soporta
la consulta v2 y `ix_study_plan_student_status_dates` se conserva durante la
compatibilidad legacy.

`created_by` define la propiedad operativa: un docente solo puede listar,
consultar, editar, archivar o generar días desde sus propios planes. Un
administrador puede gestionar planes de cualquier docente.

## Materialización diaria

`POST /api/doman/study-plans/:id/generate-day` recorre el producto de estudiantes
y categorías del nivel vigente con concurrencia máxima de cinco. Cada operación
crea o reutiliza un `doman_daily_plan` individual y devuelve un resultado
independiente:

```json
{
  "summary": { "total": 2, "generated": 1, "existing": 0, "failed": 1 },
  "results": [
    {
      "student_id": "ObjectId",
      "category_id": "ObjectId",
      "status": "generated",
      "plan": {}
    },
    {
      "student_id": "ObjectId",
      "category_id": "ObjectId",
      "status": "failed",
      "error": "No available word cards to generate the daily plan"
    }
  ]
}
```

Un fallo individual no revierte los planes generados para otros estudiantes.
`doman_daily_plans.study_plan_id` y `study_plan_level_id` conservan el origen;
sesiones, tarjetas de sesión, exposiciones y progreso permanecen ligados al
`student_id` individual.

Como la materialización ocurre dentro de una función HTTP, cada nivel admite
como máximo 100 combinaciones estudiante-categoría y 10.000 asignaciones
estimadas de tarjeta-sesión por día. El límite se valida al crear, actualizar y
generar, de modo que una configuración imposible de procesar no quede guardada.

## Compatibilidad móvil

`GET /api/doman/study-plans/active?student_id=...` conserva su contrato. Busca
el estudiante tanto en `student_ids` v2 como en `student_id` legacy y publica las
categorías del nivel vigente con la cantidad realmente disponible para ese
alumno. La generación normal de planes diarios adopta automáticamente la regla
del plan activo.

## Fuente canónica

El validador y los índices viven en
`db/mongo/lectura_aumentada_full_schema.mongosh.js`. El schema Mongoose del
módulo refleja el mismo contrato, aunque la persistencia se realiza mediante el
repositorio y la conexión Mongo compartida.
