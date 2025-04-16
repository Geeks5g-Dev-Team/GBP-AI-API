import { Injectable } from '@nestjs/common';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { SaveImageDTO } from '../dtos/save-image.dto';
import { parse, join } from 'path';
import * as sharp from 'sharp';
import * as fs from 'fs-extra';
import { FirestoreService } from 'src/infrastructure/externals/firebaseService';
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

    if (!companyId || !keyword) throw new Error('Company name and keyword are required');
    if (!images || images.length === 0) throw new Error('At least one image is required');

    const businessData = await this.firestoreService.getDocument('businesses', companyId);
    const imageUrls: string[] = [];

    for (const image of images) {
      const originalPath = image.path;
      const parsed = parse(originalPath);

      const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const jpegName = `${parsed.name}_${uniqueSuffix}.jpg`;
      const jpegPath = join(parsed.dir, jpegName);

      await sharp(originalPath).jpeg({ quality: 90 }).toFile(jpegPath);

      if (await fs.pathExists(originalPath)) {
        await fs.unlink(originalPath);
      }

      await this.exifService.addPhoneExifMetadata(jpegPath, businessData);

      const finalName = markAsUsed ? jpegName.replace('.jpg', '_used.jpg') : jpegName;

      const uploadPath = await this.storageService.upload({
        fileName: `${companyId}/${keyword}/${finalName}`,
        filePath: jpegPath,
        rootFolder: 'CLIENT_IMAGES/',
      });

      imageUrls.push(uploadPath);

      if (await fs.pathExists(jpegPath)) {
        await fs.unlink(jpegPath);
      }
    }

    return imageUrls;
  }
}
