import { Storage } from '@google-cloud/storage';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { GeneratorController } from 'src/presentation/controllers/generator.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GeneratorController],
  providers: [
    // OpenAiService,
    GenerateImageOfServiceUseCase,
    GrokService,
    GoogleStorageService,
    {
      provide: GrokService,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('GROK_API_KEY');
        if (!apiKey) {
          throw new Error('GROK_API_KEY is not defined');
        }
        return new GrokService(apiKey, 'images_grok');
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
