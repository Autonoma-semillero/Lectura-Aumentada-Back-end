# Lectura Aumentada Backend

## 1. Propósito del proyecto

Este repositorio contiene la base backend de **Lectura Aumentada**, una plataforma educativa que usa WebAR para apoyar procesos de lectoescritura con el método Doman.

El backend expone una API REST en NestJS para:

- autenticación de usuarios (student, teacher, admin),
- gestión de unidades de aprendizaje y marcadores AR,
- entrega de rutas de activos (modelo 3D, audio, imagen),
- registro de progreso de estudiantes,
- soporte de sesiones para clientes móviles y web.

Este estado del proyecto es un **scaffold arquitectónico**: estructura, interfaces, DTOs y placeholders.  
No incluye lógica de negocio final ni queries reales a base de datos.

## 2. Contexto de arquitectura de sistema

Flujo general:

1. App Android (Kotlin).
2. Render WebAR en WebView (A-Frame / MindAR).
3. API REST NestJS (este proyecto).
4. MongoDB como persistencia.

## 3. Stack tecnológico

- Framework: NestJS
- Lenguaje: TypeScript
- Base de datos: MongoDB (conexión vía `mongoose`)
- Autenticación: JWT (scaffold)
- Validación: `class-validator` (preparado, reglas detalladas pendientes)
- Patrón arquitectónico: Layered + Clean-ish

## 4. Principios de arquitectura aplicados

Cada módulo sigue capas explícitas:

- `presentation`: controllers HTTP
- `application`: services/casos de uso
- `domain`: contratos, tipos, interfaces
- `infrastructure`: repositorios y schemas
- `dto`: objetos de entrada/salida para API

Reglas clave:

- Los controladores solo delegan en servicios.
- Los servicios solo usan repositorios.
- No hay acceso directo a DB desde controladores.
- La implementación concreta se inyecta por tokens de dominio.

## 5. Estructura del repositorio

```text
src/
  main.ts
  app.module.ts

  config/
    env.config.ts
    database.config.ts
    jwt.config.ts

  common/
    guards/
      jwt-auth.guard.ts
    filters/
      http-exception.filter.ts
    interceptors/
      logging.interceptor.ts
    decorators/
      public.decorator.ts

  database/
    mongodb.module.ts
    mongodb.providers.ts

  modules/
    auth/
      presentation/
      application/
      domain/
      infrastructure/
      dto/
      auth.module.ts

    users/
      presentation/
      application/
      domain/
      infrastructure/
      dto/
      users.module.ts

    learning-units/
      presentation/
      application/
      domain/
      infrastructure/
      dto/
      learning-units.module.ts

    progress/
      presentation/
      application/
      domain/
      infrastructure/
      dto/
      progress.module.ts

    assets/
      presentation/
      application/
      domain/
      infrastructure/
      dto/
      assets.module.ts
```

## 6. Estado actual del código

Actualmente está implementado:

- bootstrapping NestJS (`main.ts`, `app.module.ts`),
- configuración base de entorno, Mongo y JWT,
- módulos funcionales con controladores y servicios placeholder,
- contratos de dominio por módulo,
- repositorios con métodos vacíos listos para completar,
- schemas base de Mongo para entidades principales.

Actualmente NO está implementado:

- lógica de autenticación real,
- estrategias Passport/JWT completas,
- persistencia real (consultas Mongo),
- reglas avanzadas de validación DTO,
- casos de uso de negocio (permisos por rol, métricas, etc.).

## 7. Modelo de dominio esperado

Colecciones principales consideradas:

- `users`
- `categories`
- `learning_units`
- `progress_logs`
- `sessions`

Relaciones conceptuales:

- un estudiante (`users`) tiene muchos registros de progreso (`progress_logs`),
- cada `progress_log` apunta a una `learning_unit`,
- cada `learning_unit` pertenece a una `category`,
- las sesiones (`sessions`) se asocian a `users`.

Nota de almacenamiento de activos:

- Mongo guarda solo metadatos/rutas URL.
- Archivos binarios (3D, audio, imagen) deben vivir en Nginx, servidor de archivos o CDN.

## 8. Descripción de módulos

### 8.1 Auth

Responsable de login, refresh, logout y control de sesiones.

Archivos relevantes:

- `presentation/auth.controller.ts`
- `application/auth.service.ts`
- `domain/interfaces/auth.repository.interface.ts`
- `infrastructure/repositories/auth.repository.ts`
- `infrastructure/schemas/session.schema.ts`

### 8.2 Users

Responsable de gestión de usuarios y roles del sistema.

Archivos relevantes:

- `presentation/users.controller.ts`
- `application/users.service.ts`
- `domain/interfaces/user.interface.ts`
- `infrastructure/schemas/user.schema.ts`

### 8.3 Learning Units

Responsable de unidades pedagógicas, marcadores y contenido asociado.

Archivos relevantes:

- `presentation/learning-units.controller.ts`
- `application/learning-units.service.ts`
- `infrastructure/schemas/learning-unit.schema.ts`
- `infrastructure/schemas/category.schema.ts`

### 8.4 Progress

Responsable del tracking de interacciones de aprendizaje.

Archivos relevantes:

- `presentation/progress.controller.ts`
- `application/progress.service.ts`
- `infrastructure/schemas/progress-log.schema.ts`

### 8.5 Assets

Responsable de exponer metadata y rutas de activos AR.

Archivos relevantes:

- `presentation/assets.controller.ts`
- `application/assets.service.ts`
- `infrastructure/schemas/asset.schema.ts`

## 9. Configuración de entorno

Variables mínimas recomendadas:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/lectura_aumentada_db
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
```

Archivos de configuración:

- `src/config/env.config.ts`
- `src/config/database.config.ts`
- `src/config/jwt.config.ts`

## 10. Ejecución local

Instalar dependencias:

```bash
npm install
```

Levantar en modo desarrollo:

```bash
npm run start:dev
```

Compilar:

```bash
npm run build
```

## 11. Convenciones para desarrollo humano e IA

Estas reglas deben respetarse al extender el proyecto:

1. No mezclar responsabilidades entre capas.
2. No saltar `service` desde `controller`.
3. No acoplar `domain` con detalles de infraestructura.
4. Mantener contratos (`interfaces`) estables y explícitos.
5. Agregar validaciones en DTO sin mover lógica de negocio a controladores.
6. Implementar queries únicamente en repositorios.
7. Mantener nombres de campos de dominio alineados con el modelo de datos objetivo.
8. Documentar decisiones no triviales en comentarios cortos y precisos.

## 12. Guía para futuras actualizaciones

### 12.1 Implementar lógica de negocio

Orden sugerido:

1. Completar repositorios por módulo (Mongo real).
2. Completar servicios con casos de uso.
3. Aplicar validaciones DTO con `class-validator`.
4. Endurecer auth (hashing, JWT guard real, refresh flow).
5. Añadir pruebas unitarias e integración.

### 12.2 Al agregar un módulo nuevo

Crear siempre:

- `presentation/*.controller.ts`
- `application/*.service.ts`
- `domain/interfaces/*`
- `infrastructure/repositories/*`
- `infrastructure/schemas/*`
- `dto/*`
- `*.module.ts`

Y registrar el módulo en `app.module.ts`.

### 12.3 Cambios de esquema Mongo

Cuando se modifiquen campos:

- actualizar `domain interfaces`,
- actualizar `dto`,
- actualizar `schemas`,
- ajustar repositorios y servicios,
- documentar impacto en este README.

## 13. Riesgos técnicos actuales

- Guard JWT es placeholder (permite acceso).
- No hay manejo fino de errores de negocio.
- No hay transacciones ni estrategia de consistencia eventual definidas.
- No hay versionado de API ni documentación OpenAPI integrada todavía.

## 14. Próximos pasos recomendados

1. Endpoints de auth con estrategia JWT real.
2. Implementación real de repositorios Mongo.
3. Swagger/OpenAPI para contrato de API.
4. Pruebas unitarias por módulo.
5. Observabilidad mínima (logs estructurados + request id).

---

Este documento define el contexto y las reglas base del proyecto para permitir trabajo coordinado entre desarrolladores y asistentes IA sin perder consistencia arquitectónica.
