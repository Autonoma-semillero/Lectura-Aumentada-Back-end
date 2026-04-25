# Guía para agentes e IA — Lectura Aumentada Backend

Este documento es la **fuente operativa** de arquitectura y convenciones. Al implementar o modificar código, **síguelo literalmente**. El `README.md` aporta contexto de producto y dominio; **este archivo fija cómo escribir código**.

---

## 1. Modelo de capas (obligatorio)

Cada módulo funcional bajo `src/modules/<nombre-modulo>/` respeta este flujo **unidireccional**:

```text
HTTP  →  presentation (controller)  →  application (service)  →  domain (interfaces)
                                              ↓
                                    infrastructure (repository + schemas)
```

| Capa | Responsabilidad | Prohibido |
|------|------------------|-----------|
| **presentation** | Rutas HTTP, parámetros, DTO de entrada/salida, decoradores Swagger (`@ApiTags`, etc.). | Lógica de negocio, Mongoose, `Connection`, consultas. |
| **application** | Orquestar casos de uso, validaciones de negocio, **mapear DTO ↔ tipos de dominio**. | Exponer detalles de HTTP; importar schemas de Mongoose. |
| **domain** | Interfaces de entidades, contrato `I*Repository`, tokens de inyección (`*.tokens.ts`), tipos puros opcionales (`domain/types/`). | Importar `@nestjs/mongoose`, `Connection`, DTOs de API. |
| **infrastructure** | Implementar repositorios contra Mongo; definir schemas. | Ser llamado desde controladores sin pasar por el servicio. |
| **dto** | Forma de los cuerpos/query de la API; `class-validator` cuando aplique; `@ApiProperty` / `@ApiPropertyOptional` para Swagger. | Lógica de negocio. |

**Reglas duras**

1. El controlador **solo** llama al servicio del mismo módulo.
2. El servicio **solo** accede a datos vía la interfaz `I*Repository` inyectada con el token del módulo.
3. **Nunca** inyectar `Connection` / modelos Mongoose en servicios ni controladores (solo en repositorios).
4. El dominio **no** importa infraestructura ni DTOs.

---

## 2. Estructura obligatoria de un módulo nuevo

Ruta base: `src/modules/<kebab-case>/` (ej. `learning-units`, `progress`).

```text
<modulo>/
  <modulo>.module.ts
  presentation/
    <modulo>.controller.ts      # kebab-case en nombre de archivo
  application/
    <modulo>.service.ts
  domain/
    constants/
      <modulo>.tokens.ts        # export const MODULO_REPOSITORY = 'MODULO_REPOSITORY';
    interfaces/
      <entidad>.interface.ts
      <modulo>.repository.interface.ts   # interfaz I*Repository
    types/                       # opcional: tipos sin comportamiento
  infrastructure/
    repositories/
      <modulo>.repository.ts
    schemas/
      *.schema.ts
  dto/
    *.dto.ts
```

Registrar el módulo en `src/app.module.ts`.

---

## 3. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Carpeta del módulo | `kebab-case` | `learning-units` |
| Archivo de módulo | `<kebab>.module.ts` | `learning-units.module.ts` |
| Clase del módulo | `PascalCase` + `Module` | `LearningUnitsModule` |
| Controller / Service | archivo `kebab-case`, clase `PascalCase` | `learning-units.controller.ts` → `LearningUnitsController` |
| Token de repositorio | `SCREAMING_SNAKE` en `*.tokens.ts` | `USERS_REPOSITORY` |
| Interfaz de repositorio | `I` + nombre plural + `Repository` | `IUsersRepository` |
| Implementación | `PascalCase` + `Repository` | `UsersRepository` |
| Inyección en servicio | propiedad `camelCase` + sufijo `Repository` | `private readonly usersRepository: IUsersRepository` |

**No** usar el nombre genérico `repository` en servicios: siempre `authRepository`, `usersRepository`, `learningUnitsRepository`, etc.

---

## 4. Registro en Nest (`*.module.ts`)

Patrón estándar:

```typescript
@Module({
  controllers: [XxxController],
  providers: [
    XxxService,
    {
      provide: XXX_REPOSITORY,
      useClass: XxxRepository,
    },
  ],
  exports: [XxxService],
})
export class XxxModule {}
```

- Un archivo `domain/constants/<modulo>.tokens.ts` con el string del token.
- El servicio usa `@Inject(XXX_REPOSITORY)` y el tipo `IXxxRepository`.

---

## 5. DTO, validación y Swagger

- Los DTO viven en `dto/` del módulo.
- Añadir decoradores **`class-validator`** cuando el endpoint deba validar entrada (alineado con `ValidationPipe` global en `main.ts`).
- Añadir **`@ApiProperty` / `@ApiPropertyOptional`** en propiedades expuestas en la API para que OpenAPI refleje el contrato.
- `@ApiTags('<nombre>')` en cada controlador, alineado con el dominio del módulo.

---

## 6. Mapeo DTO ↔ dominio

- Los DTO pueden tener forma distinta a las entidades de dominio (campos planos vs anidados).
- El **servicio** es responsable de construir `Partial<Entidad>` u objetos de dominio mediante **funciones o métodos privados explícitos** (p. ej. `private toCreatePayload(dto: CreateXDto): Partial<X>`).
- **Prohibido** usar `as unknown as T` para “mapear” salvo que exista una decisión documentada en comentario de una línea y un issue/README; la opción por defecto es mapeo explícito.
- En **PATCH** con objetos anidados en dominio: no rellenar subcampos con valores vacíos “por omisión”; o bien se envía el bloque anidado completo en el DTO, o el repositorio debe aplicar actualización parcial en persistencia (p. ej. `$set` con rutas puntuales) cuando exista lógica real.

---

## 7. API global y documentación

- Prefijo global de rutas REST: **`/api`** (`setGlobalPrefix` en `main.ts`).
- Health check: **`GET /health`** (sin prefijo `api`).
- Swagger UI: **`/api-docs`** (OpenAPI generado desde decoradores y DTOs).

---

## 8. Base de datos

- Conexión compartida: token **`MONGO_CONNECTION`** (`src/database/mongodb.providers.ts`). Solo los **repositorios** lo inyectan.
- **Fuente canónica del esquema:** `db/mongo/lectura_aumentada_full_schema.mongosh.js` (validadores + índices). Los schemas Mongoose del código deben reflejar los mismos nombres de colección y campos.
- Cambios de esquema en PR: actualizar ese script **y** documentar en `docs/origen/Arquitectura/db/` (ej. `US-BE-F1-01-categories.md`). Vocabulario Jira ↔ Mongo: **README §2.1**.
- Colecciones Doman (fase 1): repositorios de **`doman_daily_plans`** / **`doman_sessions`** en `src/modules/doman/`; otros documentos Doman pueden seguir en `src/database/doman.schemas.ts` hasta tener módulo propio.
- Nombres de campos persistidos en **inglés**, como en el script (p. ej. `learning_units.word`, `progress_logs.user_id`).

---

## 9. Autenticación y rutas públicas

- Guard JWT (cuando esté activo) y decorador **`@Public()`** (`src/common/decorators/public.decorator.ts`): los endpoints de login/refresh u otros públicos deben marcarse según la estrategia del proyecto; no duplicar lógica de token fuera del módulo `auth` salvo guards compartidos en `common/guards/`.

---

## 10. Errores y respuestas

- Usar excepciones de **`@nestjs/common`** (`NotFoundException`, `BadRequestException`, etc.) desde la capa **application** (o dominio puro si se introducen tipos de error propios).
- No filtrar detalles internos de Mongo/stack a respuestas HTTP en producción.

---

## 11. Checklist al añadir un endpoint

- [ ] DTO con validación y `@ApiProperty*` si aplica.
- [ ] Controller: delegación en un método del servicio.
- [ ] Service: lógica y mapeo; llamada al repositorio por interfaz.
- [ ] Si implica persistencia: método en `I*Repository` + implementación en repositorio.
- [ ] Cambios en schema + interface de dominio coherentes.
- [ ] Módulo exporta solo lo necesario (normalmente el servicio).

---

## 12. Pruebas (cuando existan)

- Convención Nest: `*.spec.ts` junto al archivo bajo prueba o carpeta `test/` según se configure el proyecto.
- Priorizar pruebas del **servicio** con repositorio mock y pruebas de **controlador** con servicio mock.

---

## 13. Resumen en una frase

**Una petición HTTP entra por un controller, pasa a un service que aplica reglas y mapeos, y el service habla con el mundo exterior solo a través de `I*Repository` implementado en infrastructure.**

Si una tarea no encaja en ese flujo, detenerse y replantear en capas antes de escribir código.
