# Diseño propuesto — sesiones Doman en vivo dirigidas por docente

## Estado y decisión de producto

**Estado:** propuesta de arquitectura; no aplicar el cambio de esquema hasta
aprobar este documento y el plan de migración.

La aplicación deja de tratar Doman como un plan individual que el estudiante
completa en diferido. Una sesión pasa a ser una experiencia **sincrónica**, en
la que un docente selecciona un repertorio, abre una sala para uno de sus
grupos y controla la presentación para todos los estudiantes conectados.

Se toma de Kahoot únicamente el patrón de sala y sincronización. No hay
preguntas, puntajes, clasificación, rachas, cuenta atrás competitiva ni una
declaración automática de que una palabra fue "dominada".

El modelo conserva estas capacidades existentes:

- usuarios y autenticación de estudiantes;
- creación y pertenencia a grupos;
- creación, edición y archivo de tarjetas;
- categorías y vínculo opcional con una unidad de aprendizaje/activo AR.

Se retiran del flujo nuevo los planes de estudio fechados, planes diarios y
sesiones individuales autogeneradas. Sus documentos se conservan como
histórico de solo lectura mientras se completa la migración.

## Por qué no se reutiliza el modelo actual

Las colecciones actuales `doman_study_plans`, `doman_daily_plans`,
`doman_sessions` y `doman_session_cards` codifican otra unidad de negocio:
una sesión pertenece a **un solo estudiante** y a un plan diario. Además,
`doman_word_cards` pertenece a un estudiante y acumula `times_shown` y un
estado de progreso por exposición.

En una sesión en vivo:

- una sesión pertenece a un grupo y tiene muchos participantes;
- una tarjeta se presenta una única vez por orden del docente y puede tener
  muchas confirmaciones de entrega;
- una exposición técnica no prueba reconocimiento ni aprendizaje;
- el contenido mostrado debe permanecer inmutable aunque se edite el
  repertorio o la tarjeta después de la clase.

Reutilizar los documentos anteriores produciría duplicados, estados
contradictorios y métricas pedagógicamente incorrectas. El cambio se hace con
colecciones nuevas y aditivas, sin sobrecargar campos legacy.

## Vocabulario canónico

| Concepto | Significado |
| --- | --- |
| **Tarjeta** | Pieza reutilizable de contenido: palabra, audio opcional y categoría. No pertenece a un estudiante. |
| **Repertorio** | Selección ordenada, editable y reutilizable de tarjetas que el docente prepara antes de clase. |
| **Sala / sesión en vivo** | Instancia concreta de un repertorio para un grupo, con una fotografía inmutable del contenido y de la audiencia. |
| **Participante** | Estudiante invitado a esa instancia; su presencia y entrega se registran por separado. |
| **Presentación** | Una aparición de una tarjeta en la línea de tiempo de la sesión. Repetir una tarjeta crea otra presentación. |
| **Observación docente** | Nota intencional del docente sobre participación, atención o una respuesta observada. Nunca equivale a “dominio” automático. |

## Modelo lógico

```text
users ──< student_group_memberships >── student_groups
  │                                         │
  │ created_by / teacher_id                 │ group_id + roster snapshot
  ▼                                         ▼
doman_cards ──< doman_repertoires ──< doman_live_sessions
                                         │        │
                           ┌─────────────┘        └─────────────┐
                           ▼                                    ▼
          doman_live_session_participants          doman_live_session_events
                           │                                    │
                           └────< doman_live_exposures >────────┘
                                         │
                                         ▼
                         doman_student_observations
```

`student_groups`, `student_group_memberships`, `users`, `categories` y
`learning_units` se mantienen. Las siete colecciones `doman_*` que siguen son
el nuevo dominio activo.

## Colecciones nuevas

### 1. `doman_cards`

Catálogo de tarjetas reutilizables. Reemplaza gradualmente la idea de que la
misma palabra debe duplicarse para cada estudiante.

```json
{
  "_id": "ObjectId",
  "schema_version": 1,
  "word": "elefante",
  "normalized_word": "elefante",
  "display_text": "ELEFANTE",
  "language": "es-CO",
  "audio_url": "https://…/elefante.mp3",
  "category_id": "ObjectId",
  "learning_unit_id": "ObjectId",
  "status": "active",
  "sharing_scope": "owner_only",
  "created_by": "ObjectId",
  "legacy_source_card_ids": ["ObjectId"],
  "created_at": "Date",
  "updated_at": "Date",
  "archived_at": null
}
```

Reglas:

- `word`, `normalized_word`, `display_text`, `category_id`, `status`,
  `sharing_scope`, `created_by`, `created_at` y `updated_at` son obligatorios.
- `status` es `active` o `archived`; archivar impide usar la tarjeta en
  repertorios nuevos, pero nunca borra una sesión histórica.
- `sharing_scope` es `owner_only` o `shared`. Administradores pueden gestionar
  todas las tarjetas; un docente solo puede modificar las propias.
- `learning_unit_id` y `audio_url` son opcionales. El audio no sustituye la
  voz del docente: solo es una ayuda configurable.
- No existen `student_id`, `times_shown`, `completed_at` ni `status=completed`.
  Esos campos mezclan contenido con supuesta evidencia de aprendizaje.

Índices:

```javascript
db.doman_cards.createIndex(
  { created_by: 1, category_id: 1, normalized_word: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
    name: "ux_doman_cards_owner_category_word_active"
  }
);
db.doman_cards.createIndex(
  { created_by: 1, status: 1, updated_at: -1 },
  { name: "ix_doman_cards_owner_status_updated" }
);
db.doman_cards.createIndex(
  { category_id: 1, status: 1, word: 1 },
  { name: "ix_doman_cards_category_status_word" }
);
```

### 2. `doman_repertoires`

Plantilla pedagógica que el docente escoge antes de iniciar. Un repertorio no
lleva fechas, cupos ni progreso de estudiantes.

```json
{
  "_id": "ObjectId",
  "schema_version": 1,
  "name": "Animales · conjunto 1",
  "normalized_name": "animales conjunto 1",
  "description": "Cinco palabras de animales conocidos.",
  "stage": "single_words",
  "category_id": "ObjectId",
  "card_ids": ["ObjectId", "ObjectId", "ObjectId", "ObjectId", "ObjectId"],
  "presentation": {
    "default_pacing": "teacher_controlled",
    "default_display_ms": 1000,
    "audio_policy": "teacher_voice"
  },
  "status": "active",
  "created_by": "ObjectId",
  "created_at": "Date",
  "updated_at": "Date",
  "archived_at": null
}
```

Reglas:

- `stage` permite una progresión explícita: `single_words`, `couplets`,
  `sentences` y `books`. No es una medición de la capacidad de un estudiante.
- Entre 1 y 10 tarjetas es un límite técnico; la interfaz recomienda cinco y
  exige una confirmación pedagógica para excederlas.
- `card_ids` no puede repetir tarjetas y debe respetar el orden de
  presentación. Las tarjetas deben estar activas, ser accesibles al creador y
  pertenecer a la categoría del repertorio.
- El ritmo por defecto es `teacher_controlled`. El modo `timed` es opcional,
  siempre visible para el docente y nunca inicia por sí mismo.
- Una edición crea una nueva `revision` lógica en la aplicación. Las sesiones
  ya abiertas nunca leen de nuevo este documento: usan su snapshot.

Índices:

```javascript
db.doman_repertoires.createIndex(
  { created_by: 1, normalized_name: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
    name: "ux_doman_repertoires_owner_name_active"
  }
);
db.doman_repertoires.createIndex(
  { created_by: 1, status: 1, updated_at: -1 },
  { name: "ix_doman_repertoires_owner_status_updated" }
);
```

### 3. `doman_live_sessions`

Fuente de verdad del estado actual de la clase. Se crea en estado `lobby`,
fotografía el grupo y el repertorio, y cambia por comandos atómicos del
docente. No se usa un log para reconstruir el estado normal de la pantalla.

```json
{
  "_id": "ObjectId",
  "schema_version": 1,
  "teacher_id": "ObjectId",
  "group_id": "ObjectId",
  "group_snapshot": {
    "name": "Transición A",
    "student_ids": ["ObjectId", "ObjectId"]
  },
  "repertoire_id": "ObjectId",
  "repertoire_snapshot": {
    "name": "Animales · conjunto 1",
    "stage": "single_words",
    "category_id": "ObjectId",
    "cards": [
      {
        "position": 0,
        "card_id": "ObjectId",
        "word": "elefante",
        "display_text": "ELEFANTE",
        "language": "es-CO",
        "audio_url": "https://…/elefante.mp3"
      }
    ]
  },
  "presentation": {
    "pacing": "teacher_controlled",
    "display_ms": 1000,
    "audio_policy": "teacher_voice"
  },
  "status": "lobby",
  "active_card_index": null,
  "presentation_sequence": 0,
  "presentation_started_at": null,
  "paused_at": null,
  "group_active_key": "ObjectId",
  "started_at": null,
  "ended_at": null,
  "ended_reason": null,
  "created_at": "Date",
  "updated_at": "Date"
}
```

Estados válidos y transiciones:

```text
lobby ──start──> running ──pause──> paused ──resume──> running
  │                 │                        │
  └──cancel──> cancelled   └──end──> ended   └──end──> ended
```

`ended` y `cancelled` son terminales e inmutables, salvo correcciones
administrativas auditadas. `group_active_key` vale `group_id` solo en
`lobby`, `running` y `paused`; se elimina al finalizar. Con el índice parcial
siguiente, un grupo no puede tener dos salas activas.

```javascript
db.doman_live_sessions.createIndex(
  { group_active_key: 1 },
  {
    unique: true,
    partialFilterExpression: { group_active_key: { $exists: true } },
    name: "ux_doman_live_sessions_one_active_group"
  }
);
db.doman_live_sessions.createIndex(
  { teacher_id: 1, status: 1, created_at: -1 },
  { name: "ix_doman_live_sessions_teacher_status_created" }
);
db.doman_live_sessions.createIndex(
  { "group_snapshot.student_ids": 1, status: 1, updated_at: -1 },
  { name: "ix_doman_live_sessions_student_status_updated" }
);
```

La creación de la sesión debe validar que el docente sea propietario del
grupo, que el grupo esté activo, que tenga estudiantes, que el repertorio sea
usable y que el repertorio no esté vacío. El snapshot se construye en el
servidor en la misma operación; el cliente nunca envía la lista de tarjetas ni
la audiencia definitiva.

### 4. `doman_live_session_participants`

Presencia por estudiante, separada del estado de la sala. Un estudiante puede
ver la misma sesión desde otro dispositivo sin multiplicar su identidad.

```json
{
  "_id": "ObjectId",
  "session_id": "ObjectId",
  "student_id": "ObjectId",
  "invited_at": "Date",
  "joined_at": null,
  "last_seen_at": null,
  "left_at": null,
  "connection_state": "invited",
  "active_student_key": null,
  "current_ack_sequence": 0,
  "created_at": "Date",
  "updated_at": "Date"
}
```

`connection_state` es `invited`, `connected`, `ready`, `disconnected` o
`left`. Describe conectividad, no atención ni comprensión.

Al iniciar una sesión, el servicio asigna `active_student_key: "live"` a sus
participantes. Así se impide que un estudiante entre simultáneamente en dos
sesiones de grupos distintos. Esta operación debe hacerse en una transacción
Mongo; si alguno ya está en otra sesión, el inicio falla sin dejar participantes
parcialmente bloqueados y el docente recibe la lista mínima de conflictos.

```javascript
db.doman_live_session_participants.createIndex(
  { session_id: 1, student_id: 1 },
  { unique: true, name: "ux_live_participants_session_student" }
);
db.doman_live_session_participants.createIndex(
  { student_id: 1, active_student_key: 1 },
  {
    unique: true,
    partialFilterExpression: { active_student_key: "live" },
    name: "ux_live_participants_one_active_student"
  }
);
db.doman_live_session_participants.createIndex(
  { student_id: 1, connection_state: 1, updated_at: -1 },
  { name: "ix_live_participants_student_connection" }
);
```

### 5. `doman_live_session_events`

Bitácora inmutable y ordenada de los comandos y hechos de la sesión. Sirve
para auditoría, diagnóstico y reconexión; no reemplaza el estado de
`doman_live_sessions`.

```json
{
  "_id": "ObjectId",
  "session_id": "ObjectId",
  "sequence": 4,
  "command_id": "UUID",
  "event_type": "card_presented",
  "actor_type": "teacher",
  "actor_id": "ObjectId",
  "payload": { "card_index": 1, "card_id": "ObjectId" },
  "occurred_at": "Date"
}
```

Eventos permitidos: `lobby_opened`, `student_joined`, `student_ready`,
`student_disconnected`, `session_started`, `card_presented`,
`card_repeated`, `session_paused`, `session_resumed`, `session_ended` y
`session_cancelled`.

`command_id` es una clave de idempotencia generada por el cliente docente. Un
doble toque o reintento de red devuelve el mismo resultado, no avanza dos
tarjetas. `sequence` es consecutivo dentro de la sesión y protege a los
clientes contra eventos tardíos o fuera de orden.

```javascript
db.doman_live_session_events.createIndex(
  { session_id: 1, sequence: 1 },
  { unique: true, name: "ux_live_events_session_sequence" }
);
db.doman_live_session_events.createIndex(
  { session_id: 1, command_id: 1 },
  { unique: true, sparse: true, name: "ux_live_events_session_command" }
);
db.doman_live_session_events.createIndex(
  { occurred_at: -1 },
  { name: "ix_live_events_occurred" }
);
```

### 6. `doman_live_exposures`

Registro técnico de que una presentación se emitió y, si el dispositivo lo
confirmó, se dibujó. No se llama `progress`, `completed` ni `mastery`.

```json
{
  "_id": "ObjectId",
  "session_id": "ObjectId",
  "student_id": "ObjectId",
  "presentation_sequence": 4,
  "card_id": "ObjectId",
  "card_index": 1,
  "emitted_at": "Date",
  "rendered_at": null,
  "acknowledged_at": null,
  "visibility_duration_ms": null,
  "delivery_status": "emitted",
  "created_at": "Date",
  "updated_at": "Date"
}
```

`delivery_status` es `emitted`, `rendered`, `unconfirmed` o `not_delivered`.
Solo `rendered_at` proviene de un acuse del cliente autenticado; ni siquiera
ese campo prueba que el niño miró o comprendió. La métrica de producto debe
denominarse “tarjetas entregadas/renderizadas”, nunca “palabras dominadas”.

```javascript
db.doman_live_exposures.createIndex(
  { session_id: 1, student_id: 1, presentation_sequence: 1 },
  { unique: true, name: "ux_live_exposures_participant_presentation" }
);
db.doman_live_exposures.createIndex(
  { student_id: 1, created_at: -1 },
  { name: "ix_live_exposures_student_created" }
);
db.doman_live_exposures.createIndex(
  { session_id: 1, card_id: 1 },
  { name: "ix_live_exposures_session_card" }
);
```

### 7. `doman_student_observations`

Observaciones opcionales y deliberadas del docente. Son la única vía para
guardar una respuesta pedagógica, y se expresan como observación, no como una
conclusión automática sobre el estudiante.

```json
{
  "_id": "ObjectId",
  "session_id": "ObjectId",
  "student_id": "ObjectId",
  "recorded_by": "ObjectId",
  "kind": "engagement",
  "value": "observed",
  "note": "Siguió la presentación con interés.",
  "created_at": "Date",
  "updated_at": "Date"
}
```

Valores de `kind`: `engagement`, `attention`, `observed_response` y
`follow_up`. Valores de `value`: `observed`, `not_observed`,
`needs_follow_up`. `note` es opcional, tiene un límite corto y no admite datos
sensibles ajenos a la actividad. Estas notas deben mostrar un aviso de
privacidad para docentes y una política de retención definida por la
institución.

```javascript
db.doman_student_observations.createIndex(
  { session_id: 1, student_id: 1, kind: 1 },
  { unique: true, name: "ux_live_observations_session_student_kind" }
);
db.doman_student_observations.createIndex(
  { student_id: 1, created_at: -1 },
  { name: "ix_live_observations_student_created" }
);
```

## Límites, validaciones y consistencia

| Regla | Validación de servidor |
| --- | --- |
| Audiencia | La audiencia se toma exclusivamente de los miembros activos del grupo y se fotografía al crear la sala. |
| Tamaño | Máximo inicial de 50 participantes y 10 tarjetas por repertorio; la UI recomienda 5 tarjetas. |
| Una sala por grupo | `group_active_key` e índice único parcial. |
| Un estudiante activo | bloqueo `active_student_key` en participantes; se confirma al iniciar. |
| Control | Solo docente propietario del grupo o administrador puede emitir comandos. Un estudiante solo puede leer su propia sala, declarar presencia y confirmar renderizado. |
| Orden | Cada comando usa `command_id` y `expected_sequence`; el servidor incrementa `presentation_sequence` de forma atómica. |
| Historial | La sesión usa snapshots: cambiar/archivar una tarjeta o repertorio no altera lo que se mostró. |
| Finalización | Al terminar/cancelar se liberan `group_active_key` y todos los `active_student_key` en una transacción. |
| Privacidad | No se guardan `socket_id`, IP, modelo del dispositivo ni biometría. `last_seen_at` se conserva solo para la sesión. |

Las operaciones que crean una sala con participantes, inician una sesión o la
cierran deben ejecutarse con transacciones Mongo. Por tanto, producción debe
usar un clúster Mongo con replica set (MongoDB Atlas o equivalente). Si el
entorno de desarrollo no lo ofrece, se debe fallar de forma explícita para esos
casos de uso o aplicar una compensación documentada; nunca aceptar bloqueos
parciales silenciosos.

## Contrato de tiempo real

La base de datos persiste estado y evidencia; no es el canal de sincronización
visual. El cliente obtiene primero `GET /live-sessions/:id/state` y después se
suscribe a una sala autenticada. Cada evento incluye `session_id`, `sequence`,
`status`, `active_card_index` y, cuando aplica, la tarjeta del snapshot.

```text
docente: POST comando (command_id, expected_sequence)
servidor: transacción estado + evento + exposiciones iniciales
servidor: publica evento de tiempo real a la sala
estudiante: renderiza tarjeta y confirma rendered(sequence)
servidor: actualiza únicamente su doman_live_exposure
```

La aplicación móvil, al reconectar, manda su última `sequence`; el servidor
entrega el snapshot actual si perdió un evento. Nunca debe inferir el avance
con un temporizador local.

El backend actual se despliega como función serverless de Vercel, un entorno
no adecuado para mantener WebSockets propios persistentes. La implementación
debe escoger antes de programar una de estas dos alternativas:

1. mantener el REST en Vercel y usar un proveedor administrado de tiempo real
   con autenticación firmada desde el backend; o
2. desplegar un gateway Nest/WebSocket de ejecución persistente, con adaptador
   Redis si habrá más de una instancia.

No se debe simular una sala en vivo con polling frecuente ni añadir un gateway
WebSocket directamente a la función Vercel actual.

## Endpoints que derivan del diseño

La implementación posterior puede usar estos contratos, todos bajo `/api`:

```text
GET/POST/PATCH /doman/cards
GET/POST/PATCH /doman/repertoires
POST           /doman/live-sessions                 # crea lobby
GET            /doman/live-sessions/:id
GET            /doman/live-sessions/:id/state       # snapshot para reconexión
POST           /doman/live-sessions/:id/start
POST           /doman/live-sessions/:id/commands    # next, repeat, pause, resume, end
POST           /doman/live-sessions/:id/join         # presencia del estudiante
POST           /doman/live-sessions/:id/acknowledge  # render(sequence)
POST           /doman/live-sessions/:id/observations
GET            /doman/live-sessions/current          # solo salas del alumno autenticado
```

El identificador del estudiante siempre procede del JWT para rutas de alumno;
no se acepta `student_id` enviado por el móvil. Los comandos del docente se
protegen contra doble envío con `Idempotency-Key`/`command_id` y se limitan por
tasa.

## Plan de migración seguro

1. **Inventario y respaldo.** Contar planes, sesiones y tarjetas legacy;
   detectar tarjetas sin categoría, audios inaccesibles y miembros de grupos
   inactivos. Hacer un respaldo verificable antes de escribir.
2. **Esquema aditivo.** Crear las siete colecciones, validadores e índices
   nuevos. No modificar ni borrar `doman_*` legacy todavía.
3. **Migrar catálogo.** Copiar `doman_word_cards` a `doman_cards`, agrupando
   únicamente registros equivalentes por categoría, palabra normalizada,
   idioma y audio. Guardar los IDs de origen en `legacy_source_card_ids`; no
   fusionar tarjetas que difieran en audio o contenido.
4. **No convertir falsamente el historial.** Planes diarios y sesiones
   individuales permanecen como “histórico legacy”; no se transforman en
   sesiones colectivas inexistentes.
5. **Doble lectura temporal.** La administración muestra historial legacy en
   una sección separada y el nuevo flujo solo consume las colecciones en vivo.
6. **Cambio de interfaces.** Reemplazar “Planes” por “Repertorios” y “Sesión
   en vivo”; retirar de la app infantil las acciones de completar, saltar y
   marcar dominada.
7. **Corte controlado.** Tras una ventana definida de validación, bloquear la
   creación de planes legacy. La eliminación física requiere una política de
   retención aprobada y una migración separada.

La migración ejecutable vive en
`scripts/migrations/20260925-live-doman-sessions.js`. Es idempotente y se
ejecuta primero sin efectos:

```bash
npm run migrate:live-doman
```

Para escribir requiere `--apply` y, cuando las tarjetas legacy no tenían
`created_by`, el ID de un docente o administrador que será su propietario:

```bash
npm run migrate:live-doman -- --apply --fallback-owner-id=<ObjectId>
```

El retiro renombra las colecciones antiguas como `legacy_doman_*`; la purga
solo acepta una confirmación explícita y nunca se ejecuta como parte de la
migración normal:

```bash
npm run migrate:live-doman -- --apply --retire-legacy
npm run migrate:live-doman -- --apply --retire-legacy --purge-legacy --confirm-purge=DELETE_LEGACY_DOMAN
```

## Criterios de aceptación de la futura implementación

- El docente puede escoger un grupo y un repertorio de cinco tarjetas, abrir
  la sala y ver quién está listo.
- Al iniciar, todos los participantes conectados reciben la misma tarjeta y
  el mismo `sequence` desde el servidor.
- Solo el docente puede avanzar, repetir, pausar, reanudar o terminar.
- Un estudiante que reconecta recupera exactamente la tarjeta actual, no una
  sesión individual distinta ni una tarjeta adelantada.
- Finalizar temprano es una acción normal; el reporte dice “sesión finalizada
  por el docente”, no “actividad incompleta”.
- Los reportes diferencian invitado, conectado, renderizado y observación
  docente. Ninguno infiere aprendizaje por número de exposiciones.
- Editar una tarjeta/repertorio posterior no cambia el contenido ni el
  reporte de una sesión ya terminada.
- El niño no ve datos de otros estudiantes, tabla de posiciones ni controles
  de profesor.

