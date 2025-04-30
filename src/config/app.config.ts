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
    origin: (origin, callback) => {
      const allowedOrigins = [
        /^http:\/\/localhost(:\d+)?$/,
        /^https:\/\/googlerankai\.vercel\.app(:\d+)?$/,
        /^https:\/\/html.onlineviewer.net$/, // ✅ new origin
        /^https:\/\/gbp-ai-api\.onrender\.com(:\d+)?$/,
      ];

      console.log('CORS origin check:', origin);

      // if (!origin || allowedOrigins.some((regex) => regex.test(origin))) {
      //   callback(null, true);
      // } else {
      //   callback(new Error('Not allowed by CORS'));
      // }
      callback(null, true);
    },
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
