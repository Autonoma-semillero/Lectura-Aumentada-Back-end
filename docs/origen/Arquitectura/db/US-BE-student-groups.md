# Grupos dinámicos de estudiantes

## Objetivo

Los planes y otras operaciones docentes pueden dirigirse a estudiantes individuales,
grupos completos o una combinación de ambos. La pertenencia no se guarda dentro del
documento de usuario: se modela como una relación N:M para que un estudiante pueda
estar en cero, uno o varios grupos sin duplicar sus datos.

La fuente canónica de validadores e índices es
`db/mongo/lectura_aumentada_full_schema.mongosh.js`.

## Colección `student_groups`

| Campo             | BSON     | Regla                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------- |
| `name`            | string   | Nombre visible, entre 1 y 100 caracteres.                             |
| `normalized_name` | string   | Nombre normalizado para búsqueda sin distinguir mayúsculas ni tildes. |
| `description`     | string   | Opcional, máximo 500 caracteres.                                      |
| `teacher_id`      | ObjectId | Propietario del grupo. Un docente solo gestiona los suyos.            |
| `status`          | string   | `active` o `archived`.                                                |
| `created_by`      | ObjectId | Usuario docente/administrador que creó el grupo.                      |
| `created_at`      | date     | Fecha de creación.                                                    |
| `updated_at`      | date     | Última modificación.                                                  |

Índices:

- `ix_student_groups_teacher_status_name`: `{ teacher_id, status, normalized_name }` para listado y búsqueda docente.
- `ux_student_groups_teacher_active_name`: índice único parcial `{ teacher_id, normalized_name }` para impedir nombres activos duplicados por docente sin bloquear la reutilización de nombres archivados.
- `ix_student_groups_creator_updated`: `{ created_by, updated_at }` para auditoría operacional.

## Colección `student_group_memberships`

| Campo        | BSON     | Regla                                          |
| ------------ | -------- | ---------------------------------------------- |
| `group_id`   | ObjectId | Grupo relacionado.                             |
| `student_id` | ObjectId | Usuario con rol `student`.                     |
| `added_by`   | ObjectId | Docente/administrador que hizo la vinculación. |
| `created_at` | date     | Fecha de vinculación.                          |

Índices:

- `ux_student_group_membership`: único `{ group_id, student_id }`; hace idempotente la adición masiva.
- `ix_student_group_membership_student`: `{ student_id, group_id }`; permite encontrar grupos y detectar estudiantes huérfanos.

## Ciclo de vida y autorización

- Un estudiante sin documentos de membresía está **huérfano** y sigue siendo válido para selección directa.
- Un estudiante puede tener documentos de membresía para varios grupos.
- Un docente lista y modifica exclusivamente grupos cuyo `teacher_id` coincide con su usuario.
- Un administrador puede operar cualquier grupo, pero al crearlo debe indicar un
  `teacher_id` que exista, esté activo y tenga el rol `teacher`; un administrador
  no se convierte implícitamente en propietario docente.
- Archivar mediante `DELETE /api/groups/:id` cambia `status` a `archived` y elimina todas sus membresías. No elimina físicamente el grupo.
- El buscador de audiencia entrega elementos discriminados `student`/`group`; cada estudiante incluye únicamente los `group_ids` activos accesibles para el solicitante. `unassigned=true` significa que no pertenece a ningún grupo activo accesible (grupos propios para docente, todos para administrador), sin filtrar información de otros docentes.
- La resolución de audiencia une estudiantes directos y miembros de grupos, elimina duplicados y conserva las fuentes (`direct` o `group`).

## Aplicación del esquema

Desde la raíz del repositorio:

```bash
mongosh "$MONGODB_URI" --file db/mongo/lectura_aumentada_full_schema.mongosh.js
```

El script usa `collMod` con nivel de validación `moderate` cuando las colecciones ya
existen, por lo que puede aplicarse de forma repetible durante el despliegue.
