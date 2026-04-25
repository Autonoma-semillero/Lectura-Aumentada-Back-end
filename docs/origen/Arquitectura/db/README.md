# Base de datos — evidencia de arquitectura

Esta carpeta acumula **evidencia** alineada al modelo canónico de MongoDB del backend.

## Fuentes de verdad (README §2.1)

Además del script `db/mongo/lectura_aumentada_full_schema.mongosh.js`, el equipo debe usar como referencia:

| Recurso | Ruta en repo (añadir si falta) |
|---------|--------------------------------|
| Diagrama lógico | `docs/origen/Arquitectura/db/Db_1.png` |
| Documento estructura | `docs/origen/Arquitectura/db/Estructura base de datos MongoDB.docx` |
| Script canónico | [`db/mongo/lectura_aumentada_full_schema.mongosh.js`](../../../../db/mongo/lectura_aumentada_full_schema.mongosh.js) |
| Fase 1 Doman (referencia) | `docs/agentic/db-fase1-doman.md` |

## Regla de cambios (aceptación US-BE-F1-01 y siguientes)

Cualquier cambio de **esquema** (validadores `$jsonSchema`, índices, nombres de colección o campos) debe ir en un PR que:

1. Actualice el script canónico: [`db/mongo/lectura_aumentada_full_schema.mongosh.js`](../../../../db/mongo/lectura_aumentada_full_schema.mongosh.js) *(ruta relativa desde este archivo: cuatro niveles hasta la raíz del repo)*.
2. Añada o actualice un documento en **`docs/origen/Arquitectura/db/`** describiendo el cambio y el vínculo con la historia (Jira / ID US-BE-…).

Los schemas Mongoose en `src/modules/*/infrastructure/schemas/` deben seguir reflejando ese contrato (ver [`AGENTS.md`](../../../../AGENTS.md)).

## Historias documentadas

| ID | Archivo |
|----|-----------|
| US-BE-F1-01 | [US-BE-F1-01-categories.md](./US-BE-F1-01-categories.md) |
