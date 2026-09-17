/** Límite síncrono para proteger la función HTTP y el documento de auditoría. */
export const MAX_DOMAN_BULK_AUDIENCE_SIZE = 50;

/** Evita crear cientos de planes diarios dentro de una sola función HTTP. */
export const MAX_DOMAN_STUDY_PLAN_DAY_JOBS = 100;

/** Cota estimada de filas session_cards creadas por una generación diaria. */
export const MAX_DOMAN_STUDY_PLAN_DAY_SESSION_CARDS = 10_000;
