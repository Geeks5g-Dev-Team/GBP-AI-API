import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { S3Client } from '@aws-sdk/client-s3'; // ✅ S3 SDK import

import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';
import { S3StorageService } from 'src/infrastructure/externals/S3StorageService'; // ✅ your new S3-based class
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { OpenAiService } from 'src/infrastructure/externals/OpenAiApiService';
import { GeneratorController } from 'src/presentation/controllers/generator.controller';
import { FirebaseModule } from './firebase/firebase.module';
import { FirestoreService } from 'src/infrastructure/externals/firebaseService';
import OpenAI from 'openai';
import { ExifService } from '../infrastructure/externals/utils/exif.service';
import { GoogleDriveService } from 'src/infrastructure/externals/GoogleDriveService';
import { DropboxService } from 'src/infrastructure/externals/DropboxService';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
    FirebaseModule,
  ],
  controllers: [GeneratorController],
  providers: [
    FirestoreService,
    GenerateImageOfServiceUseCase,
    SaveImageUseCase,
    ExifService,
    GoogleDriveService,
    DropboxService,

    // ✅ GrokService Provider
    {
      provide: GrokService,
      useFactory: (configService: ConfigService, exifService: ExifService) => {
        const apiKey = configService.get<string>('GROK_API_KEY');
        if (!apiKey) {
          throw new Error('GROK_API_KEY is not defined');
        }
        return new GrokService(apiKey, 'images_grok', exifService);
      },
      inject: [ConfigService, ExifService],
    },

    // ✅ OpenAI Provider
    {
      provide: OpenAiService,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is not defined');
        }
        const openai = new OpenAI({ apiKey });
        return new OpenAiService(openai);
      },
      inject: [ConfigService],
    },

    // ✅ S3StorageService Provider
    {
      provide: S3StorageService,
      useFactory: (configService: ConfigService) => {
        const bucketName = configService.get<string>('AWS_BUCKET_NAME');
        const region = configService.get<string>('AWS_REGION');
        const accessKeyId = configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = configService.get<string>('AWS_SECRET_ACCESS_KEY');

        if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
          throw new Error('Missing AWS S3 configuration');
        }

        const s3Client = new S3Client({
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });

        return new S3StorageService(s3Client, bucketName);
      },
      inject: [ConfigService],
    },
  ],
  exports: [GrokService, S3StorageService], // ✅ Export S3 instead of Google
})
export class GeneratorModule {}
