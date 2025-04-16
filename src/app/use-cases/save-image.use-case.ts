import { Injectable } from '@nestjs/common';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { SaveImageDTO } from '../dtos/save-image.dto';
import { FirestoreService } from '../../infrastructure/externals/firebaseService';
import { ExifService } from 'src/infrastructure/externals/utils/exif.service';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';

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
        const originalPath = image.path;
        const jpegName = `${path.parse(image.filename).name}.jpg`;
        const jpegPath = path.join(path.dirname(originalPath), jpegName);

        await sharp(originalPath).jpeg({ quality: 90 }).toFile(jpegPath);

        if (originalPath !== jpegPath && (await fs.pathExists(originalPath))) {
          await fs.unlink(originalPath);
        }

        await this.exifService.addPhoneExifMetadata(jpegPath, businessData);

        const finalName = markAsUsed ? jpegName.replace('.jpg', '_used.jpg') : jpegName;

        const uploadPath = await this.storageService.upload({
          fileName: `${companyId}/${keyword}/${finalName}`,
          filePath: jpegPath,
          rootFolder: 'CLIENT_IMAGES/',
        });

        return uploadPath;
      }),
    );
    console.log('Image URLs:', imageUrls);
    return imageUrls;
  }
}
