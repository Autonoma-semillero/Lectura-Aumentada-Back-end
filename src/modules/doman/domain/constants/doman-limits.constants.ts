/** Límite síncrono para proteger la función HTTP y el documento de auditoría. */
export const MAX_DOMAN_BULK_AUDIENCE_SIZE = 50;

/** Evita crear cientos de planes diarios dentro de una sola función HTTP. */
export const MAX_DOMAN_STUDY_PLAN_DAY_JOBS = 100;

/** Cota estimada de filas session_cards creadas por una generación diaria. */
export const MAX_DOMAN_STUDY_PLAN_DAY_SESSION_CARDS = 10_000;

/*
 * Cotas canónicas de un plan diario. Son la única fuente de verdad para los
 * DTO, los clamps de los servicios y el validador Mongo: los rangos deben
 * coincidir en los tres lugares o el contrato publicado en Swagger deja de
 * describir lo que el servicio acepta.
 */

/** Tarjetas por plan diario; alineado con `doman_study_plans.levels[].categories[].target_cards_count`. */
export const MIN_DAILY_PLAN_TARGET_CARDS = 1;
export const MAX_DAILY_PLAN_TARGET_CARDS = 50;

/** Sesiones por plan diario; alineado con `doman_study_plans.sessions_per_day`. */
export const MIN_DAILY_PLAN_TARGET_SESSIONS = 1;
export const MAX_DAILY_PLAN_TARGET_SESSIONS = 10;

/** Tiempo de exposición por tarjeta; alineado con `doman_study_plans.display_ms`. */
export const MIN_DOMAN_DISPLAY_MS = 200;
export const MAX_DOMAN_DISPLAY_MS = 10_000;

/** Valores por defecto cuando ni el DTO ni el plan de estudio los definen. */
export const DEFAULT_DAILY_PLAN_TARGET_CARDS = 5;
export const DEFAULT_DAILY_PLAN_TARGET_SESSIONS = 5;
export const DEFAULT_DOMAN_DISPLAY_MS = 2200;
