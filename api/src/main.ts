import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // CORS para o frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://192.168.18.223:3000', 'http://192.168.18.223'],
    credentials: true,
  });

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Swagger — documentação da API
  const config = new DocumentBuilder()
    .setTitle('Heimdall API')
    .setDescription('Sistema de autorização de entrada e saída de materiais de visitantes')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🛡️  Heimdall API rodando em http://0.0.0.0:${port}`);
  console.log(`📚 Documentação: http://0.0.0.0:${port}/docs`);
}

bootstrap();
