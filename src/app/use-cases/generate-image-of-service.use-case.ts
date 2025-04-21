import { Injectable, Logger } from '@nestjs/common';
import { GenerateImageOfServiceDto } from '../dtos/generate-image-of-service.dto';
import { buildPromptFromTemplate, dataTemplate } from '../builders/prompt.builder';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { OpenAiService } from 'src/infrastructure/externals/OpenAiApiService';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { FirestoreService } from 'src/infrastructure/externals/firebaseService';
import axios from 'axios';

@Injectable()
export class GenerateImageOfServiceUseCase {
  private readonly logger = new Logger(GenerateImageOfServiceUseCase.name);

  constructor(
    private readonly grokService: GrokService,
    private readonly openAiService: OpenAiService,
    private readonly storageService: GoogleStorageService,
    private readonly firestoreService: FirestoreService,
  ) {}

  async execute(data: GenerateImageOfServiceDto): Promise<[string, string, string]> {
    this.validateInput(data);

    const { companyId, keyword, numberOfImages } = data;
    const sanitizedCompany = this.sanitizeName(companyId);
    const sanitizedKeyword = this.sanitizeName(keyword);

    // 1. Check for unused client-uploaded images
    const clientImageResult = await this.findAndProcessUnusedImage(sanitizedCompany, sanitizedKeyword, 'CLIENT_IMAGES/');
    if (clientImageResult) {
      this.logger.log(`Using client-provided image for ${sanitizedCompany}/${sanitizedKeyword}`);
      return clientImageResult;
    }

    // 2. Check for unused AI-generated images
    const iaImageResult = await this.findAndProcessUnusedImage(sanitizedCompany, sanitizedKeyword, 'IA_IMAGES/');
    if (iaImageResult) {
      this.logger.log(`Using AI-generated image for ${sanitizedCompany}/${sanitizedKeyword}`);
      return iaImageResult;
    }

    if (iaImageResult) {
      this.logger.log(`Using existing AI-generated image for ${sanitizedCompany}/${sanitizedKeyword}`);
      return iaImageResult;
    }

    // 3. Generate new image
    this.logger.log(`Generating new image for ${sanitizedCompany}/${sanitizedKeyword}`);
    return this.generateAndUploadNewImage(data, sanitizedCompany, sanitizedKeyword);
  }

  private validateInput(data: GenerateImageOfServiceDto): void {
    const { companyId, keyword } = data;
    if (!companyId || !keyword) {
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
    const NEST_API_URL = process.env.NEST_API_URL || 'http://localhost:3000';

    let businessData: any;
    try {
      const response = await axios.get(`${NEST_API_URL}/businesses/${data.companyId}`);
      businessData = response.data?.gmbData;
      if (!businessData) throw new Error('Missing gmbData from user record');
    } catch (error) {
      console.error('Error fetching user from Nest API:', error);
      throw new Error('Failed to retrieve business data');
    }
    console.log('Business data:', businessData);

    const dataTransfored: dataTemplate = {
      country: businessData.serviceArea?.places?.placeInfos[0]?.placeName || '',
      mainService: businessData.title || '',
      businessType: service || '',
      keyword: data.keyword || '',
    };
    const rawPrompt = buildPromptFromTemplate(dataTransfored);
    console.log('Prompt:', rawPrompt);
    const { postPrompt, imagePrompt } = await this.openAiService.generatePostAndImagePrompts(rawPrompt, data.keyword, businessData);
    console.log('Post Prompt:', postPrompt);
    console.log('Improved Prompt:', imagePrompt);
    const localImagePath = await this.grokService.generateImage(imagePrompt, data.numberOfImages, data.companyId);

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
    await this.grokService.deleteImage(localImagePath);

    return [postPrompt, localImagePath, uploadPath];
  }

  private extractFileName(path: string): string {
    const filename = path.split('/').pop();
    return filename?.split('\\').pop() || 'image.jpg';
  }
}
