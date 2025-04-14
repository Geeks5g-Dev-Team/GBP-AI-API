import { Injectable, Logger } from '@nestjs/common';
import { GenerateImageOfServiceDto } from '../dtos/generate-image-of-service.dto';
import { buildPromptFromTemplate, dataTemplate } from '../builders/prompt.builder';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { FirestoreService } from 'src/infrastructure/externals/firebaseService';

@Injectable()
export class GenerateImageOfServiceUseCase {
  private readonly logger = new Logger(GenerateImageOfServiceUseCase.name);

  constructor(
    private readonly generatorService: GrokService,
    private readonly storageService: GoogleStorageService,
    private readonly firestoreService: FirestoreService,
  ) {}

  async execute(data: GenerateImageOfServiceDto): Promise<[string, string, string]> {
    this.validateInput(data);

    const { companyId, serviceName, numberOfImages } = data;
    const sanitizedCompany = this.sanitizeName(companyId);
    const sanitizedService = this.sanitizeName(serviceName);

    // First priority: Check CLIENT_IMAGES for unused images
    const clientImageResult = await this.findAndProcessUnusedImage(sanitizedCompany, sanitizedService, 'CLIENT_IMAGES/');

    if (clientImageResult) {
      this.logger.log(`Using client-provided image for ${sanitizedCompany}/${sanitizedService}`);
      return clientImageResult;
    }

    // Second priority: Check IA_IMAGES for unused images
    const iaImageResult = await this.findAndProcessUnusedImage(sanitizedCompany, sanitizedService, 'IA_IMAGES/');

    if (iaImageResult) {
      this.logger.log(`Using existing AI-generated image for ${sanitizedCompany}/${sanitizedService}`);
      return iaImageResult;
    }

    // Last resort: Generate new image with Grok
    this.logger.log(`Generating new image for ${sanitizedCompany}/${sanitizedService}`);
    return this.generateAndUploadNewImage(data, sanitizedCompany, sanitizedService);
  }

  private validateInput(data: GenerateImageOfServiceDto): void {
    const { companyId, serviceName } = data;
    if (!companyId || !serviceName) {
      throw new Error('Company name and service name are required');
    }
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private async findAndProcessUnusedImage(company: string, service: string, rootFolder: string): Promise<[string, string, string] | null> {
    const [hasUnusedImages, unusedImages] = await this.findUnusedImages(company, service, rootFolder);

    if (!hasUnusedImages) {
      return null;
    }

    const imagePath = unusedImages[0];
    const imageName = imagePath.split('/').pop() || 'image.jpg';

    // Mark image as used by renaming
    const usedImageName = this.getUsedImageName(imageName);
    await this.storageService.renameFile({
      fileName: `${company}/${service}/${imageName}`,
      newFileName: `${company}/${service}/${usedImageName}`,
      rootFolder,
    });
    // Download the image
    const downloadPath = await this.storageService.download({
      fileName: `${company}/${service}/${usedImageName}`,
      rootFolder,
    });
    this.logger.log(`Marked image as used: ${rootFolder}/${company}/${service}/${usedImageName}`);

    return ['', imagePath, downloadPath];
  }

  private async findUnusedImages(company: string, service: string, rootFolder: string): Promise<[boolean, string[]]> {
    const images = await this.storageService.getImages({
      prefix: `${company}/${service}/`,
      rootFolder,
    });

    const unusedImages = images.filter((image) => !image.includes('_used.jpg'));
    return [unusedImages.length > 0, unusedImages];
  }

  private getUsedImageName(imageName: string): string {
    if (imageName.includes('_used.jpg')) {
      return imageName;
    }
    return imageName.replace('.jpg', '_used.jpg');
  }

  private async generateAndUploadNewImage(data: GenerateImageOfServiceDto, company: string, service: string): Promise<[string, string, string]> {
    const businessData = await this.firestoreService.getDocument('businesses', data.companyId);
    const dataTransfored: dataTemplate = {
      country: businessData.serviceArea.places.placeInfos[0].placeName,
      mainService: businessData.title,
      businessType: service,
      additional_context: businessData.categories.primaryCategory.moreHoursTypes.map((category) => category.localizedDisplayName).join(', '),
    };
    const prompt = buildPromptFromTemplate(dataTransfored);
    const [revisedPrompt, localImagePath] = await this.generatorService.generateImage(prompt, data.numberOfImages, data.companyId);

    const imageName = this.extractFileName(localImagePath);

    // Upload the newly generated image
    const uploadPath = await this.storageService.upload({
      fileName: `${company}/${service}/${imageName}`,
      filePath: localImagePath,
      rootFolder: 'IA_IMAGES/',
    });

    // // Mark the newly uploaded image as used
    // const usedImageName = this.getUsedImageName(imageName);
    // await this.storageService.renameFile({
    //   fileName: `${company}/${service}/${imageName}`,
    //   newFileName: `${company}/${service}/${usedImageName}`,
    //   rootFolder: 'IA_IMAGES/',
    // });

    // this.logger.log(`Marked newly generated image as used: IA_IMAGES/${company}/${service}/${usedImageName}`);

    // Clean up local file
    await this.generatorService.deleteImage(localImagePath);

    return [revisedPrompt, localImagePath, uploadPath];
  }

  private extractFileName(path: string): string {
    const filename = path.split('/').pop();
    return filename?.split('\\').pop() || 'image.jpg';
  }
}
