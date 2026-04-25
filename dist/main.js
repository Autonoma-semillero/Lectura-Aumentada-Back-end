"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const server = app.getHttpAdapter().getInstance();
    app.setGlobalPrefix('api');
    server.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    server.get('/api/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Lectura Aumentada API')
        .setDescription('API REST para la plataforma Lectura Aumentada: autenticación, unidades de aprendizaje, progreso y activos AR.')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    swagger_1.SwaggerModule.setup('api/api-docs', app, document);
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
//# sourceMappingURL=main.js.map