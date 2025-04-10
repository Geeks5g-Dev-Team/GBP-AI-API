import { Injectable } from '@nestjs/common';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';

interface UploadImageDTO {
  companyName: string;
  serviceName: string;
  images: Express.Multer.File[];
  markAsUsed?: boolean;
}

@Injectable()
export class SaveImageUseCase {
  constructor(private readonly storageService: GoogleStorageService) {}

  async execute(saveImageDTO: UploadImageDTO): Promise<string[]> {
    const { companyName, serviceName, images, markAsUsed } = saveImageDTO;

    // Verificaciones
    if (!companyName || !serviceName) {
      throw new Error('Company name and service name are required');
    }
    if (!images || images.length === 0) {
      throw new Error('At least one image is required');
    }
    const imageUrls = await Promise.all(
      images.map(async (image) => {
        const imageName = image.originalname.replace('.jpg', Math.floor(Math.random() * 1000) + '.jpg');
        const imagePath = image.path;
        const uploadPath = await this.storageService.upload({
          fileName: `${companyName}/${serviceName}/${markAsUsed ? imageName.replace('.jpg', '_used.jpg') : imageName}`,
          filePath: imagePath,
          rootFolder: 'CLIENT_IMAGES/',
        });

        return uploadPath;
      }),
    );
    return imageUrls;
  }
}
