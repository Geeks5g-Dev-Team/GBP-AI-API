import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middlewares de seguridad
  app.use(helmet(appConfig.security.helmet));
  app.use(compression());
  app.use(rateLimit(appConfig.security.rateLimit));

  // Configuración CORS
  app.enableCors(appConfig.corsOptions);

  // Versionamiento de API
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  // Validación global
  app.useGlobalPipes(appConfig.validationPipe);

  // Documentación Swagger
  const config = new DocumentBuilder().setTitle('GBP AI GOOGLE API').setDescription('API for GBP AI GOOGLE Software Development').setVersion('1.0').addBearerAuth().build();

  const document = SwaggerModule.createDocument(app, config);

  // Configuración de Swagger con opciones personalizadas
  SwaggerModule.setup('api/docs', app, document, {
    customCss: `
      .swagger-ui .topbar { 
        background-color: #1976D2; 
        border-bottom: 3px solid #1565C0; 
      }
      .swagger-ui .topbar-wrapper img { 
        content: url('https://res.cloudinary.com/expertise-com/image/upload/f_auto,q_55,c_fill,w_256/remote_media/logos/digital-marketing-agencies-austin-geeks5g-com.jpg'); 
        width: 150px; 
        height: auto; 
      }
      .swagger-ui .info { 
        margin: 20px 0; 
        padding: 15px; 
        background-color: #F5F5F5; 
        border-radius: 5px; 
      }
      .swagger-ui .information-container .description {
        color: #333;
        font-size: 16px;
      }
      .opblock-summary-post { background-color: rgba(73, 204, 144, 0.1); }
      .opblock-summary-get { background-color: rgba(97, 175, 254, 0.1); }
      .opblock-summary-put { background-color: rgba(252, 161, 48, 0.1); }
      .opblock-summary-delete { background-color: rgba(249, 62, 62, 0.1); }
    `,
    customJs: `
      // Puedes agregar scripts personalizados aquí si lo necesitas
      window.onload = function() {
        // Ejemplo: Personalizar título de la página
        document.title = 'GBP AI GOOGLE - Documentación API';
      }
    `,
    // Configuraciones adicionales
    swaggerOptions: {
      docExpansion: 'list', // Expande la lista de operaciones por defecto
      filter: true, // Añade un filtro de búsqueda
      showRequestDuration: true, // Muestra la duración de las solicitudes
      defaultModelsExpandDepth: 1, // Profundidad de expansión de modelos
      defaultModelExpandDepth: 1,
      displayOperationId: true, // Muestra los IDs de operación
      displayRequestDuration: true, // Muestra la duración de las solicitudes
      syntaxHighlight: {
        activate: true,
        theme: 'monokai', // Tema de resaltado de sintaxis
      },
    },
  });

  // Puerto de escucha
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
