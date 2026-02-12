import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Content Platform API')
    .setDescription('API for creators, content, feed, search, and AI assist')
    .setVersion('1.0')
    .addTag('creators', 'Creator management')
    .addTag('content', 'Content CRUD and publishing')
    .addTag('feed', 'Paginated content feed')
    .addTag('search', 'Full-text search')
    .addTag('ai', 'AI-powered assist with tool calling')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
