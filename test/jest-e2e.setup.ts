/**
 * Defaults for local e2e runs. CI sets these explicitly in the workflow.
 */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'e2e-jwt-secret-must-be-at-least-32-chars!!';
}
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/lectura_aumentada_e2e';
}
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.AUTH_DEMO_SEED_ENABLED = process.env.AUTH_DEMO_SEED_ENABLED ?? 'true';
process.env.DEMO_CONTENT_SEED_ENABLED =
  process.env.DEMO_CONTENT_SEED_ENABLED ?? 'false';
