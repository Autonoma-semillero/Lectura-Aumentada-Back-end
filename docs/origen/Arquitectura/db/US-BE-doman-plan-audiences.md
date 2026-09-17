# Audiencias dinámicas y grupos para planes Doman

## Decisión de diseño

Una asignación de plan puede seleccionar simultáneamente grupos y estudiantes.
El backend expande la membresía, elimina duplicados y guarda una fotografía de la
audiencia. La ejecución diaria, las sesiones y el progreso continúan siendo
individuales por estudiante; compartir esos estados produciría resultados
incorrectos cuando los alumnos avanzan a ritmos distintos.

Cambiar la membresía de un grupo después de crear una asignación no modifica su
audiencia histórica. Un estudiante puede pertenecer a cero, uno o varios grupos.
Archivar un grupo elimina sus membresías activas, pero nunca elimina usuarios,
planes, sesiones ni progreso.

## Colecciones

### `student_groups`

- `_id`: ObjectId.
- `name` / `normalized_name`: nombre visible y versión normalizada.
- `description`: texto opcional.
- `teacher_id`: docente propietario.
- `status`: `active` o `archived`.
- `created_by`, `created_at`, `updated_at`.

El índice único parcial `(teacher_id, normalized_name)` impide nombres repetidos
entre los grupos activos de un mismo docente.

### `student_group_memberships`

- `group_id`: grupo.
- `student_id`: usuario con rol `student`.
- `added_by`, `created_at`.

El índice único `(group_id, student_id)` evita duplicar una membresía. Al no
guardar `group_id` dentro de `users`, un estudiante puede estar sin grupo o en
varios grupos sin alterar la entidad de usuario.

### `doman_plan_assignments`

Representa una operación lógica de asignación masiva:

- `group_ids`: grupos solicitados.
- `direct_student_ids`: estudiantes seleccionados explícitamente.
- `student_ids`: unión deduplicada resuelta al crearla.
- `students`: fotografía de cada estudiante y sus fuentes (`direct` y/o grupo).
- Configuración del plan: fecha, categoría y parámetros Doman opcionales.
- `status`: `processing`, `completed`, `partial` o `failed`.
- `summary` y `results`: resultado independiente por estudiante.
- `created_by`, `created_at`, `updated_at`.

Los resultados pueden ser parciales: la ausencia de tarjetas de un estudiante no
revierte los planes generados correctamente para los demás.

La audiencia resuelta tiene un máximo operativo de **50 estudiantes únicos**. El
backend responde `400 Bad Request` antes de crear la asignación cuando la unión de
grupos y estudiantes directos supera ese límite. El mismo máximo se refleja en el
validador Mongo de `student_ids`, `students` y `results` para proteger el tiempo de
la función HTTP y evitar documentos de auditoría excesivos.

La generación masiva no admite `force=true`: regenerar destructivamente muchos
planes dentro de una única petición no es una operación segura. El cliente debe
enviar `false` u omitir el campo; una solicitud con `true` recibe `400 Bad Request`.

## API

- `GET /api/groups/audience/search`: busca grupos y estudiantes en una sola lista.
- `POST /api/doman/daily-plans/bulk-generate`: crea la fotografía de audiencia y
  genera o reutiliza un plan diario por estudiante.
- `GET /api/doman/plan-assignments`: consulta las asignaciones creadas por el
  docente autenticado; un administrador puede consultar todas.
- `GET /api/doman/plan-assignments/:id`: obtiene el detalle y los resultados.

Si el mismo estudiante aparece en un grupo y también fue seleccionado de forma
directa, recibe un único plan y se conservan ambas fuentes en la fotografía.
