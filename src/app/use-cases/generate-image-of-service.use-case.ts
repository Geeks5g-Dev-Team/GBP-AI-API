import { Injectable } from '@nestjs/common';
import { GenerateImageOfServiceDto } from '../dtos/generate-image-of-service.dto';
import { buildPromptFromTemplate } from '../builders/prompt.builder';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';

@Injectable()
export class GenerateImageOfServiceUseCase {
  constructor(
    private readonly generatorService: GrokService,
    private readonly storageService: GoogleStorageService,
  ) {}

  async execute(data: GenerateImageOfServiceDto): Promise<[string, string]> {
    const { numberOfImages, companyName, serviceName } = data;
    const prompt = buildPromptFromTemplate(data);
    const imagePath = await this.generatorService.generateImage(prompt, numberOfImages);
    let imageName = imagePath.split('/').pop();
    imageName = imageName?.split('\\').pop();

    const uploadPath = await this.storageService.upload({
      fileName: companyName + '/' + serviceName + '/' + imageName,
      filePath: imagePath,
    });
    console.log('FileName: ' + companyName.toLocaleLowerCase().replaceAll(' ', '_') + '/' + serviceName.toLocaleLowerCase().replaceAll(' ', '_') + '/' + imageName);
    return [imagePath, uploadPath];
  }
}
