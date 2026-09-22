# Catálogo de marcadores AR

## Objetivo

Hasta ahora el marcador no era una entidad: `marker_id` era un `string` requerido
dentro de `learning_units` y el modelo 3D vivía en `learning_units.assets.model_3d`.
Eso obligaba a inventar una palabra de vocabulario para poder dar de alta un
marcador, y no había forma de administrar el catálogo de marcadores por sí mismo.

La colección `markers` convierte el marcador en entidad de primera clase: se crea
con su código y su nombre, y se le asocia (o se le reemplaza) un modelo 3D de forma
independiente del contenido pedagógico.

La fuente canónica de validadores e índices es
`db/mongo/lectura_aumentada_full_schema.mongosh.js`.

## Colección `markers`

| Campo                 | BSON     | Regla                                                                                      |
| --------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `code`                | string   | Clave natural que emite el motor AR, 1–128. Normalizada e **inmutable** tras la creación.   |
| `name`                | string   | Nombre visible en el panel docente, 1–120.                                                   |
| `description`         | string   | Opcional, máximo 500 caracteres.                                                             |
| `model_3d_url`        | string   | Opcional, máximo 2048. URL del `.glb` ya alojado; el binario **no** se guarda en Mongo.      |
| `model_3d_format`     | string   | `glb` o `gltf`. Solo presente si hay `model_3d_url`.                                         |
| `model_3d_updated_at` | date     | Momento del último registro de modelo. Permite invalidar caché del binario en el cliente.    |
| `status`              | string   | `active` o `archived`.                                                                       |
| `created_by`          | ObjectId | Usuario docente/administrador que creó el marcador.                                          |
| `created_at`          | date     | Fecha de creación.                                                                           |
| `updated_at`          | date     | Última modificación de cualquier campo.                                                      |

Índices:

- `ux_markers_code`: único `{ code }`. Es la invariante central —un marcador por código AR— y lo que permite traducir el error 11000/11001 del driver a `409 Conflict`.
- `ix_markers_status_code`: `{ status, code }` para el listado filtrado del panel docente con orden estable.
- `ix_markers_creator_updated`: `{ created_by, updated_at }` para auditoría operacional, espejo de `ix_student_groups_creator_updated`.

### Normalización del código

`code` se persiste normalizado: sin diacríticos, en minúsculas, con los espacios
convertidos en guiones, y debe cumplir `^[a-z0-9][a-z0-9._-]*$`. El código viaja en
`GET /api/markers/code/:code`, de ahí la restricción de caracteres.

## Convivencia con `learning_units.marker_id`

Esta es la decisión de diseño que hay que respetar al tocar cualquiera de las dos
colecciones.

- **Relación por clave natural, no por ObjectId.** `learning_units.marker_id` sigue
  siendo un `string` y no se migra: el motor AR emite un string, no un identificador
  de base de datos. Cambiar el tipo obligaría a migrar datos y a tocar
  `GET /api/assets/marker/:markerId`, que la app Android consume en producción.
- **Un código pertenece a una colección o a la otra, nunca a las dos.** La disyunción
  se garantiza **en escritura**: `POST /api/markers` devuelve `409` si el código ya
  existe en `markers` **o** si ya está en uso como `learning_units.marker_id`. Así no
  puede haber dos `model_3d` contradictorios para el mismo marcador y no hace falta
  ninguna regla de precedencia en lectura, ni sincronización, ni doble escritura.
- **`GET /api/assets/marker/:markerId` no cambia.** El módulo `markers` no lee ni
  escribe `learning_units`, salvo una consulta de solo lectura sobre el índice
  `ix_learning_units_marker` para el `409` anterior.
- **Sin migración de los marcadores existentes.** Los `demo-<categoria>-<palabra>`
  que siembra el seed conservan su modelo en `learning_units.assets.model_3d`. La
  mayoría apunta a URLs placebo `https://demo.lectura.local/` que
  `AssetsService.getUsableModelUrl` ya descarta; importarlas sería sembrar basura.

### Consecuencia asumida

Un marcador creado por `POST /api/markers` **no** es resoluble por
`GET /api/assets/marker/:markerId` mientras no exista una `learning_unit` con ese
código. El consumidor previsto de estas APIs es el panel docente, vía `/api/markers/*`.

Integrar el catálogo nuevo con el endpoint que usa Android es trabajo posterior y
requiere una decisión de contrato: hoy `AssetResponseDto` declara `learning_unit_id`
y `word` como campos requeridos, y un marcador suelto no tiene ninguno de los dos.

## Ciclo de vida y autorización

- Crear, editar, registrar o borrar modelo y archivar: `teacher` y `admin`
  (`RolesGuard` + `@Roles`). Listar y consultar: cualquier usuario autenticado, porque
  el cliente AR lee con token de estudiante.
- `code` no se expone en `UpdateMarkerDto`. Con `forbidNonWhitelisted: true`, enviarlo
  devuelve `400` sin necesidad de código adicional.
- `DELETE /api/markers/:id` **archiva** (`status: 'archived'`), no borra: `sessions.marker_id`
  guarda histórico y un borrado físico corrompería la trazabilidad. Precedente:
  `DELETE /api/groups/:id`.
- `DELETE /api/markers/:id/model` se traduce a `$unset`, nunca a `$set: { model_3d_url: null }`:
  el validador declara `bsonType: 'string'` y rechazaría un `null`.
- No se puede registrar un modelo en un marcador archivado (`409`).
- `markers` es un **módulo hoja**: no importa ningún otro módulo de dominio. La
  validación referencial (“¿existe el marcador que referencio?”) corresponde al lado
  que tiene la clave foránea, nunca a `markers`.

## Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Modelo 3D como URL registrada | Subida real del archivo | El despliegue en Vercel es serverless: disco de solo lectura, `/tmp` efímero y `uploads/` no se monta en esa ruta. El README §7.3 ya fija que Mongo guarda solo metadatos y URLs. |
| Campos `model_3d_*` planos | Objeto embebido `model_3d: { … }` | Se pidió lo mínimo. `additionalProperties: true` permite crecer sin migración. |
| Colección nueva | CRUD sobre `learning_units.marker_id` | `learning_units` exige `word`, lo que ataría cada marcador a una palabra de vocabulario. |
| Sin `learning_unit_id` en el marcador | Referencia bidireccional | Dos representaciones de la misma arista es exactamente la doble fuente de verdad que se quiere evitar. La arista vive en `learning_units.marker_id`. |
| Archivar | Borrado físico | `sessions.marker_id` referencia códigos históricos. |

## Aplicación del esquema

Desde la raíz del repositorio:

```bash
mongosh "$MONGODB_URI" --file db/mongo/lectura_aumentada_full_schema.mongosh.js
```

El script usa `collMod` con nivel de validación `moderate` cuando las colecciones ya
existen, por lo que puede aplicarse de forma repetible durante el despliegue.

**Debe ejecutarse antes de desplegar el backend**: el índice único `ux_markers_code`
tiene que existir antes de la primera escritura real. El servicio lleva además un
pre-chequeo por código, de modo que en entornos donde el script aún no se haya
aplicado (por ejemplo CI) el duplicado se sigue rechazando con `409`.
