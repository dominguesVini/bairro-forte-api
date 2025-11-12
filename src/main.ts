import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const certKeyPath =
    process.env.SSL_KEY_PATH ||
    path.join(__dirname, 'certs', 'certs/privkey.pem');
  const certCrtPath =
    process.env.SSL_CERT_PATH ||
    path.join(__dirname, 'certs', 'certs/fullchain.pem');

  let app;
  try {
    const httpsOptions = {
      key: fs.readFileSync(certKeyPath),
      cert: fs.readFileSync(certCrtPath),
    };
    app = await NestFactory.create(AppModule, { httpsOptions });
  } catch (err) {
    app = await NestFactory.create(AppModule);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Habilita transformação automática de tipos
      transformOptions: {
        enableImplicitConversion: true, // Permite conversão implícita
      },
    }),
  );
  const config = app.get(ConfigService);

  if (!(global as any).crypto) {
    (global as any).crypto = crypto;
  }

  console.log('ENV VARS');
  console.log('DB_HOST:', config.get('DB_HOST'));
  console.log('DB_PORT:', config.get('DB_PORT'));
  console.log('DB_USERNAME:', config.get('DB_USERNAME'));

  const port = Number(process.env.PORT || 443);
  await app.listen(port);
}
bootstrap();
