import { Injectable } from '@nestjs/common';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { SaveImageDTO } from '../dtos/save-image.dto';

interface UploadImageDTO {
  companyName: string;
  serviceName: string;
  image: Express.Multer.File;
}

@Injectable()
export class SaveImageUseCase {
  constructor(private readonly storageService: GoogleStorageService) {}

  async execute(saveImageDTO: UploadImageDTO): Promise<string> {
    const { companyName, serviceName, image } = saveImageDTO;

    // Verificaciones
    if (!companyName || !serviceName) {
      throw new Error('Company name and service name are required');
    }
    if (!image) {
      throw new Error('Image is required');
    }

    const imageName = image.originalname;
    const imagePath = image.path;

    const uploadPath = await this.storageService.upload({
      fileName: `${companyName}/${serviceName}/${imageName.replace('.jpg', '_used.jpg')}`,
      filePath: imagePath,
      rootFolder: 'CLIENT_IMAGES/',
    });

    return uploadPath;
  }
}
