import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const appConfig = {
  // Configuración de validación global
  validationPipe: new ValidationPipe({
    whitelist: true, // Eliminar propiedades no definidas en DTO
    forbidNonWhitelisted: true, // Lanzar error si hay propiedades no definidas
    transform: true, // Transformar payloads a tipos DTO
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),

  // Configuración de CORS
  corsOptions: <CorsOptions>{
    origin: [
      'http://localhost:3000', // Frontend local
      // /\.yourdomain\.com$/, // Dominios permitidos con regex
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    maxAge: 3600,
  },

  // Configuración de seguridad
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // Máximo 100 solicitudes por IP
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    },
  },
};
