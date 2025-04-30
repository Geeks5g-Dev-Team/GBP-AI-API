import { Storage } from '@google-cloud/storage';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
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
    {
      provide: GoogleStorageService,
      useFactory: (configService: ConfigService) => {
        const googleCredentials = configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
        const bucketName = configService.get<string>('GOOGLE_BUCKET_NAME');
        if (!googleCredentials) {
          throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not defined');
        }
        if (!bucketName) {
          throw new Error('GOOGLE_BUCKET_NAME is not defined');
        }
        const storage = new Storage({
          keyFile: googleCredentials,
        });
        return new GoogleStorageService(storage, bucketName);
      },
      inject: [ConfigService],
    },
  ],
  exports: [GrokService, GoogleStorageService],
})
export class GeneratorModule {}
