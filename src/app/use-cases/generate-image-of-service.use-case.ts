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
    // verify if the companyName and serviceName are not empty
    if (!companyName || !serviceName) {
      throw new Error('Company name and service name are required');
    }
    const companyNameSanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const serviceNameSanitized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    // verify if exist image in storage and if it is used
    const [existImage, images] = await this.existImagesUnused(companyNameSanitized, serviceNameSanitized);
    if (!existImage) {
      // if it is used, generate a new image
      const prompt = buildPromptFromTemplate(data);
      const imagePath = await this.generatorService.generateImage(prompt, numberOfImages);
      let imageName = imagePath.split('/').pop();
      imageName = imageName?.split('\\').pop();
      const uploadPath = await this.storageService.upload({
        fileName: companyNameSanitized + '/' + serviceNameSanitized + '/' + imageName,
        filePath: imagePath,
        rootFolder: 'IA_IMAGES/',
      });
      // rename the file in storage to mark it as used
      await this.storageService.renameFile({
        fileName: companyNameSanitized + '/' + serviceNameSanitized + '/' + imageName,
        newFileName: companyNameSanitized + '/' + serviceNameSanitized + '/' + imageName,
        rootFolder: 'IA_IMAGES/',
      });
      // delete the image from the generator service
      await this.generatorService.deleteImage(imagePath);
      return [imagePath, uploadPath];
    } else {
      // if it is not used, download the image
      const imageName = images[0].split('/').pop();
      const uploadPath = await this.storageService.download({
        fileName: companyNameSanitized + '/' + serviceNameSanitized + '/' + imageName,
        rootFolder: 'IA_IMAGES/',
      });
      // rename the file in storage to mark it as used
      await this.storageService.renameFile({
        fileName: companyNameSanitized + '/' + serviceNameSanitized + '/' + imageName,
        newFileName: companyNameSanitized + '/' + serviceNameSanitized + '/' + (!imageName?.includes('_used.jpg') ? imageName?.replace('.jpg', '_used.jpg') : imageName) || 'image.jpg',
        rootFolder: 'IA_IMAGES/',
      });
      return [images[0], uploadPath];
    }
  }

  async existImagesUnused(companyNameSanitized: string, serviceNameSanitized: string): Promise<[boolean, string[]]> {
    const images = await this.storageService.getImages({
      prefix: `${companyNameSanitized}/${serviceNameSanitized}/`,
      rootFolder: 'IA_IMAGES/',
    });
    const unusedImages = images.filter((image) => !image.includes('_used.jpg'));
    return [unusedImages.length > 0, unusedImages];
  }
}
