import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  authDemoSeedEnabled: process.env.AUTH_DEMO_SEED_ENABLED ?? 'true',
  demoContentSeedEnabled: process.env.DEMO_CONTENT_SEED_ENABLED ?? 'true',
  demoStudentEmail: process.env.DEMO_STUDENT_EMAIL ?? 'student@lectura.app',
  demoStudentPassword: process.env.DEMO_STUDENT_PASSWORD ?? 'Lectura123!',
  demoStudentDisplayName:
    process.env.DEMO_STUDENT_DISPLAY_NAME ?? 'Demo Student',
  demoTeacherEmail: process.env.DEMO_TEACHER_EMAIL ?? 'teacher@lectura.app',
  demoTeacherPassword: process.env.DEMO_TEACHER_PASSWORD ?? 'Lectura123!',
  demoTeacherDisplayName:
    process.env.DEMO_TEACHER_DISPLAY_NAME ?? 'Demo Teacher',
}));
