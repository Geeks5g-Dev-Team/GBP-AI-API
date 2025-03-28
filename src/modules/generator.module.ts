import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { OpenAiService } from 'src/infrastructure/externals/OpenAiApiService';
import { GeneratorController } from 'src/presentation/controllers/generator.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GeneratorController],
  providers: [
    // OpenAiService,
    GenerateImageOfServiceUseCase,
    GrokService,
    // {
    //   provide: OpenAI,
    //   useFactory: (configService: ConfigService) => {
    //     const apiKey = configService.get<string>('OPENAI_API_KEY');
    //     return new OpenAI({
    //       apiKey: apiKey,
    //     });
    //   },
    //   inject: [ConfigService],
    // },
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
    // {
    //   provide: OpenAiService,
    //   useFactory: (openAi: OpenAI) => {
    //     return new OpenAiService(openAi);
    //   },
    //   inject: [OpenAI],
    // },
  ],
  exports: [GrokService],
})
export class GeneratorModule {}
