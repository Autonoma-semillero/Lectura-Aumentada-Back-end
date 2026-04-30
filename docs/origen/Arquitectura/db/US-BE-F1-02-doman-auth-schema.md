# US-BE-F1-02 — Alineación Doman, sesiones y auth con esquema canónico

## Resumen

- **`doman_exposure_logs.event_type`**: contrato API y dominio incluyen `session_completed`, alineado con `db/mongo/lectura_aumentada_full_schema.mongosh.js`.
- **`doman_daily_plans`**: unicidad de negocio **1 plan por `(student_id, plan_date)`**; `category_id` pasa a **requerido** en el validador canónico.
- **`doman_sessions`**: `category_id` **requerido** en el validador canónico.
- **`sessions` (producto)**: `client_metadata` almacena `access_token_jti` y `access_token_hash` (SHA-256 del JWT), no el token en claro.
- **Eliminación**: `src/database/doman.schemas.ts` (duplicado y desalineado); la fuente de verdad es el script mongosh + repositorios en `src/modules/doman/`.

## Migración de datos existentes

- Documentos `doman_daily_plans` o `doman_sessions` sin `category_id` quedarán fuera de cumplimiento estricto del validador; el código registra **warnings** al mapear. Completar `category_id` en Mongo antes de subir `validationLevel` si aplica.

## Referencias

- Script canónico: `db/mongo/lectura_aumentada_full_schema.mongosh.js`
- README vocabulario: §2.1
