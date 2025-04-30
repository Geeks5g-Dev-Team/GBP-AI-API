import { Injectable, Logger } from '@nestjs/common';
import { GenerateImageOfServiceDto } from '../dtos/generate-image-of-service.dto';
import { buildPromptFromTemplate, dataTemplate } from '../builders/prompt.builder';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { OpenAiService } from 'src/infrastructure/externals/OpenAiApiService';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import axios from 'axios';

@Injectable()
export class GenerateImageOfServiceUseCase {
  private readonly logger = new Logger(GenerateImageOfServiceUseCase.name);

  constructor(
    private readonly grokService: GrokService,
    private readonly openAiService: OpenAiService,
    private readonly storageService: GoogleStorageService,
  ) {}

  async execute(data: GenerateImageOfServiceDto): Promise<[string, string, string]> {
    this.validateInput(data);

    const { companyId, keyword } = data;
    const sanitizedKeyword = this.sanitizeName(keyword);

    // 1. Check for unused client-uploaded images
    const clientImageResult = await this.findAndProcessUnusedImage(companyId, 'CLIENT_IMAGES/');
    if (clientImageResult) {
      const [keyword, imageUrl, downloadPath] = clientImageResult;
      console.log('clientImageResult', clientImageResult);
      this.logger.log(`Using client-provided image for ${companyId}/${keyword}`);
      return ['', imageUrl, downloadPath];
    }

    // 2. Check for unused AI-generated images
    const aiImageResult = await this.findAndProcessUnusedImage(companyId, 'IA_IMAGES/');
    if (aiImageResult) {
      const [keyword, imageUrl, downloadPath] = aiImageResult;
      this.logger.log(`Using AI-generated image for ${companyId}/${keyword}`);
      return ['', imageUrl, downloadPath];
    }

    // 3. Generate new image
    this.logger.log(`Generating new image for ${companyId}/${sanitizedKeyword}`);
    return this.generateAndUploadNewImage(data, sanitizedKeyword);
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

  private async findAndProcessUnusedImage(company: string, rootFolder: string): Promise<[string, string, string] | null> {
    const [hasUnusedImages, keyword, imageUrl] = await this.findUnusedImage(company, rootFolder);

    if (!hasUnusedImages || !imageUrl || !keyword) {
      return null;
    }

    const imageName = imageUrl.split('/').pop() || 'image.jpg';

    // Generate renamed (used) version
    const usedImageName = this.getUsedImageName(imageName);

    // Rename the file in storage to mark it as used
    await this.storageService.renameFile({
      fileName: `${company}/${keyword}/${imageName}`,
      newFileName: `${company}/${keyword}/${usedImageName}`,
      rootFolder,
    });

    // Download the renamed image
    const downloadPath = await this.storageService.download({
      fileName: `${company}/${keyword}/${usedImageName}`,
      rootFolder,
    });

    this.logger.log(`✅ Marked image as used: ${rootFolder}${company}/${keyword}/${usedImageName}`);

    // Return keyword (folder), original image URL, and downloaded path
    return [keyword, imageUrl, downloadPath];
  }

  private async findUnusedImage(company: string, rootFolder: string): Promise<[boolean, string | null, string | null]> {
    const prefix = `${company}/`;
    const serviceFolders = await this.storageService.listFolders({ prefix, rootFolder });
    console.log('serviceFolders', serviceFolders);

    for (const folder of serviceFolders) {
      const servicePrefix = `${prefix}${folder}/`;
      const images = await this.storageService.getImages({
        prefix: servicePrefix,
        rootFolder,
      });

      const unusedImage = images.find((image) => !image.includes('_used.jpg'));
      if (unusedImage) {
        return [true, folder, unusedImage];
      }
    }

    return [false, null, null]; // No unused images found
  }

  private getUsedImageName(imageName: string): string {
    if (imageName.includes('_used.jpg')) {
      return imageName;
    }
    return imageName.replace('.jpg', '_used.jpg');
  }

  private async getPrompts(data: GenerateImageOfServiceDto, service: string): Promise<[string, string]> {
    const NEST_API_URL = process.env.NEST_API_URL || 'http://localhost:3000';

    let businessData: any;
    try {
      const response = await axios.get(`${NEST_API_URL}/businesses/${data.companyId}`);
      businessData = response.data;
      if (!businessData) throw new Error('Missing business data from user record');
    } catch (error) {
      console.error('Error fetching user from Nest API:', error);
      throw new Error('Failed to retrieve business data');
    }

    const dataTransfored: dataTemplate = {
      country: businessData.gmbData.serviceArea?.places?.placeInfos[0]?.placeName || '',
      mainService: businessData.gmbData.title || '',
      businessType: service || '',
      keyword: data.keyword || '',
    };

    const rawPrompt = buildPromptFromTemplate(dataTransfored);
    console.log('Prompt:', rawPrompt);
    const { postPrompt, imagePrompt } = await this.openAiService.generatePostAndImagePrompts(rawPrompt, data.keyword, businessData);
    console.log('Post Prompt:', postPrompt);
    console.log('Improved Prompt:', imagePrompt);

    if (businessData.imagePrompt && businessData.imagePrompt.trim() !== '') {
      console.log('✅ Using stored imagePrompt from database');
      return [postPrompt, businessData.imagePrompt];
    } else {
      console.log('❌ No stored imagePrompt found in database');
      return [postPrompt, imagePrompt];
    }
  }

  private async generateAndUploadNewImage(data: GenerateImageOfServiceDto, service: string): Promise<[string, string, string]> {
    const [postPrompt, imagePrompt] = await this.getPrompts(data, service);
    const localImagePath = await this.grokService.generateImage(imagePrompt, data.numberOfImages, data.companyId);

    const imageName = this.extractFileName(localImagePath);

    // Upload the newly generated image
    const uploadPath = await this.storageService.upload({
      fileName: `${data.companyId}/${service}/${imageName}`,
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
