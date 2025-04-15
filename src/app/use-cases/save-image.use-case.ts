import { Injectable } from '@nestjs/common';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { SaveImageDTO } from '../dtos/save-image.dto';
import { extname } from 'path';
import { FirestoreService } from '../../infrastructure/externals/firebaseService';
import { ExifService } from 'src/infrastructure/externals/utils/exif.service';

@Injectable()
export class SaveImageUseCase {
  constructor(
    private readonly storageService: GoogleStorageService,
    private readonly firestoreService: FirestoreService,
    private readonly exifService: ExifService,
  ) {}

  async execute(saveImageDTO: SaveImageDTO, images: Express.Multer.File[]): Promise<string[]> {
    const { companyId, keyword, markAsUsed } = saveImageDTO;

    if (!companyId || !keyword) {
      throw new Error('Company name and keyword are required');
    }
    if (!images || images.length === 0) {
      throw new Error('At least one image is required');
    }

    const businessData = await this.firestoreService.getDocument('businesses', companyId);

    const imageUrls = await Promise.all(
      images.map(async (image) => {
        const imagePath = image.path;
        const imageName = image.filename;

        await this.exifService.addPhoneExifMetadata(imagePath, businessData);

        const finalName = markAsUsed ? imageName.replace(extname(imageName), `_used${extname(imageName)}`) : imageName;

        const uploadPath = await this.storageService.upload({
          fileName: `${companyId}/${keyword}/${finalName}`,
          filePath: imagePath,
          rootFolder: 'CLIENT_IMAGES/',
        });

        return uploadPath;
      }),
    );
    return imageUrls;
  }
}
