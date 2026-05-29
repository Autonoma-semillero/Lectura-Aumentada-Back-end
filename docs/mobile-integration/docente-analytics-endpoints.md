# API Docente — Endpoints de analítica (Sprint 3 · US-BE-GC-02)

> **Destino:** equipo mobile (Flutter / React Native).  
> **Base URL:** `https://<host>/api`  
> **Swagger UI:** `https://<host>/api-docs` — todos los endpoints están documentados allí.

---

## Autenticación

Todos los endpoints de este documento requieren:

1. **Bearer token JWT** en el header `Authorization`.
2. El usuario autenticado debe tener **rol `teacher`** (docente). Si el token pertenece a un
   estudiante o admin, el servidor devuelve `403 Forbidden`.

```
Authorization: Bearer <access_token>
```

El token se obtiene en el flujo de login estándar:

```
POST /api/auth/login
Content-Type: application/json

{ "email": "docente@ejemplo.com", "password": "..." }
```

Respuesta:
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "...",
    "email": "docente@ejemplo.com",
    "roles": ["teacher"],
    "status": "active"
  }
}
```

---

## Endpoint 1 — Lista de estudiantes

```
GET /api/docente/students
Authorization: Bearer <token>
```

Devuelve todos los usuarios con rol `student` activos en la plataforma. No recibe parámetros.

### Respuesta exitosa `200 OK`

```json
[
  {
    "id": "664f1a2b3c4d5e6f7a8b9c0d",
    "email": "juan.perez@escuela.com",
    "displayName": "Juan Pérez"
  },
  {
    "id": "664f1a2b3c4d5e6f7a8b9c0e",
    "email": "maria.garcia@escuela.com",
    "displayName": "María García"
  }
]
```

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `string` | MongoDB ObjectId en formato hex-24 |
| `email` | `string` | Email del estudiante |
| `displayName` | `string \| null` | Nombre visible; puede ser `null` si no está configurado |

### Errores

| Status | Causa |
|--------|-------|
| `401` | Token ausente o expirado |
| `403` | El token no corresponde a un docente (`role !== 'teacher'`) |

---

## Endpoint 2 — Progreso del estudiante por temática

```
GET /api/docente/students/:studentId/progress
Authorization: Bearer <token>
```

Devuelve un resumen del estado de las tarjetas Doman del estudiante, agrupado por cada temática
(categoría) en la que tiene tarjetas asignadas.

### Parámetros de ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `studentId` | `string` | Sí | MongoDB ObjectId del estudiante (`id` del endpoint 1) |

### Respuesta exitosa `200 OK`

```json
[
  {
    "categoryId": "664f1a2b3c4d5e6f7a8b9c01",
    "categoryName": "Cocina",
    "categorySlug": "cocina",
    "total": 10,
    "byStatus": {
      "new": 3,
      "active": 4,
      "completed": 3,
      "archived": 0
    },
    "phase2Ready": false
  },
  {
    "categoryId": "664f1a2b3c4d5e6f7a8b9c02",
    "categoryName": "Animales",
    "categorySlug": "animales",
    "total": 5,
    "byStatus": {
      "new": 0,
      "active": 0,
      "completed": 4,
      "archived": 1
    },
    "phase2Ready": true
  }
]
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `categoryId` | `string` | ID de la temática |
| `categoryName` | `string` | Nombre legible de la temática |
| `categorySlug` | `string` | Slug URL-friendly |
| `total` | `number` | Total de tarjetas del estudiante en esta temática (incluye `archived`) |
| `byStatus.new` | `number` | Tarjetas sin exposición |
| `byStatus.active` | `number` | Tarjetas en proceso |
| `byStatus.completed` | `number` | Tarjetas dominadas |
| `byStatus.archived` | `number` | Tarjetas archivadas |
| `phase2Ready` | `boolean` | `true` cuando todas las tarjetas activas están en `completed` (excluyendo archivadas). Indica que el estudiante puede avanzar a fase 2 en esa temática. |

**Regla `phase2Ready`:** se activa cuando:
- `total - archived > 0` (hay tarjetas no archivadas)
- `new === 0 AND active === 0` (no quedan tarjetas sin completar)

### Errores

| Status | Causa |
|--------|-------|
| `400` | `studentId` no es un ObjectId válido (24 caracteres hex) |
| `401` | Token ausente o expirado |
| `403` | El token no corresponde a un docente |
| `404` | El estudiante no existe o no tiene rol `student` |

---

## Endpoint 3 — Tarjetas dominadas del estudiante

```
GET /api/docente/students/:studentId/cards/completed
Authorization: Bearer <token>
```

Lista paginada de las tarjetas en estado `completed` del estudiante. Soporta filtro por temática.

### Parámetros de ruta

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `studentId` | `string` | Sí |

### Query params

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `categoryId` | `string` | — | Filtrar por temática. ObjectId hex-24. Omitir para todas las temáticas. |
| `page` | `number` | `1` | Página a retornar (mínimo: 1) |
| `limit` | `number` | `20` | Resultados por página (mínimo: 1, máximo: 100) |

### Respuesta exitosa `200 OK`

```json
{
  "data": [
    {
      "id": "664f1a2b3c4d5e6f7a8b9c10",
      "word": "CASA",
      "audioUrl": "https://storage.example.com/audio/casa.mp3",
      "category": {
        "id": "664f1a2b3c4d5e6f7a8b9c01",
        "name": "Hogar",
        "slug": "hogar"
      },
      "timesShown": 8,
      "timesAudioPlayed": 6,
      "completedAt": "2026-05-20T10:00:00.000Z"
    },
    {
      "id": "664f1a2b3c4d5e6f7a8b9c11",
      "word": "MESA",
      "audioUrl": null,
      "category": {
        "id": "664f1a2b3c4d5e6f7a8b9c01",
        "name": "Hogar",
        "slug": "hogar"
      },
      "timesShown": 5,
      "timesAudioPlayed": 3,
      "completedAt": "2026-05-18T08:30:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data` | `array` | Tarjetas de la página actual |
| `data[].id` | `string` | ID de la tarjeta |
| `data[].word` | `string` | Palabra en mayúsculas |
| `data[].audioUrl` | `string \| null` | URL del audio asociado. Puede ser `null`. |
| `data[].category.id` | `string` | ID de la temática |
| `data[].category.name` | `string` | Nombre de la temática |
| `data[].category.slug` | `string` | Slug de la temática |
| `data[].timesShown` | `number` | Cantidad de veces que se mostró la tarjeta |
| `data[].timesAudioPlayed` | `number` | Cantidad de veces que se reprodujo el audio |
| `data[].completedAt` | `string (ISO 8601) \| null` | Timestamp en que la tarjeta fue marcada como dominada |
| `total` | `number` | Total de resultados (para calcular páginas: `Math.ceil(total / limit)`) |
| `page` | `number` | Página actual |
| `limit` | `number` | Límite aplicado |

Las tarjetas vienen ordenadas por `completedAt` descendente (las más recientes primero).

### Errores

| Status | Causa |
|--------|-------|
| `400` | `studentId` o `categoryId` no son ObjectIds válidos |
| `401` | Token ausente o expirado |
| `403` | El token no corresponde a un docente |
| `404` | El estudiante no existe |

---

## Ejemplos cURL listos para probar

```bash
# 1. Login y obtener token
TOKEN=$(curl -s -X POST https://<host>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"docente@test.com","password":"secret123"}' \
  | jq -r '.accessToken')

# 2. Listar estudiantes
curl -s https://<host>/api/docente/students \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Progreso del primer estudiante
STUDENT_ID="664f1a2b3c4d5e6f7a8b9c0d"
curl -s "https://<host>/api/docente/students/$STUDENT_ID/progress" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Tarjetas dominadas — página 1, todas las temáticas
curl -s "https://<host>/api/docente/students/$STUDENT_ID/cards/completed?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. Tarjetas dominadas — filtrar por temática
CATEGORY_ID="664f1a2b3c4d5e6f7a8b9c01"
curl -s "https://<host>/api/docente/students/$STUDENT_ID/cards/completed?categoryId=$CATEGORY_ID&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Flujo de pantallas sugerido (referencia UX)

```
[Login docente]
      │
      ▼
[GET /docente/students]
 Lista de alumnos
      │
      ▼ (tap en alumno)
[GET /docente/students/:id/progress]
 Resumen por temática — tarjetas y phase2Ready
      │
      ▼ (tap en temática o "ver dominadas")
[GET /docente/students/:id/cards/completed?categoryId=...]
 Lista paginada de tarjetas dominadas
```

---

## Notas de integración

- **Paginación:** usar `total` y `limit` para calcular el número total de páginas
  (`totalPages = Math.ceil(total / limit)`). Incrementar `page` para cargar más resultados.
- **`phase2Ready`:** este flag es el semáforo principal en la pantalla de progreso. Si es `true`,
  mostrar un indicador visual destacado (insignia, color verde, etc.).
- **`audioUrl`:** puede ser `null` si la tarjeta no tiene audio cargado. Manejar ese caso sin
  mostrar botón de reproducción.
- **`displayName`:** puede ser `null`. Si es `null`, usar el `email` como nombre de fallback.
- **Todos los IDs** son MongoDB ObjectIds en formato string hex de 24 caracteres.
  Úsalos como cadenas opacas; no intentar parsearlos.
- **Rate limit global:** 200 requests / 60 segundos por IP.
