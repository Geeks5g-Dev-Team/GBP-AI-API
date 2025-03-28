import { Injectable } from '@nestjs/common';
import { GenerateImageOfServiceDto } from '../dtos/generate-image-of-service.dto';
import { buildPromptFromTemplate } from '../builders/prompt.builder';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';

@Injectable()
export class GenerateImageOfServiceUseCase {
  constructor(private readonly generatorService: GrokService) {}

  async execute(data: GenerateImageOfServiceDto): Promise<string> {
    const { numberOfImages, size } = data;
    const prompt = buildPromptFromTemplate(data);
    return await this.generatorService.generateImage(prompt, numberOfImages, size);
  }
}
