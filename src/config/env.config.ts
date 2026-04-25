import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  authDemoSeedEnabled: process.env.AUTH_DEMO_SEED_ENABLED ?? 'true',
  demoStudentEmail: process.env.DEMO_STUDENT_EMAIL ?? 'student@lectura.app',
  demoStudentPassword: process.env.DEMO_STUDENT_PASSWORD ?? 'Lectura123!',
  demoStudentDisplayName:
    process.env.DEMO_STUDENT_DISPLAY_NAME ?? 'Demo Student',
}));
