import { Injectable } from '@nestjs/common';
import { S3StorageService } from 'src/infrastructure/externals/S3StorageService';
import { SaveImageDTO } from '../dtos/save-image.dto';
import { parse, join } from 'path';
import * as sharp from 'sharp';
import * as fs from 'fs-extra';
import { FirestoreService } from 'src/infrastructure/externals/firebaseService';
import { ExifService } from 'src/infrastructure/externals/utils/exif.service';
import axios from 'axios';
import * as heicConvert from 'heic-convert';

async function convertHeicToJpg(inputPath: string, outputPath: string) {
  const inputBuffer = await fs.readFile(inputPath);

  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.9,
  });

  fs.writeFile(outputPath, Buffer.from(outputBuffer));
}

@Injectable()
export class SaveImageUseCase {
  constructor(
    private readonly storageService: S3StorageService,
    private readonly firestoreService: FirestoreService,
    private readonly exifService: ExifService,
  ) {}

  async execute(saveImageDTO: SaveImageDTO, images: Express.Multer.File[]): Promise<string[]> {
    const { companyId, keyword, markAsUsed } = saveImageDTO;

    if (!companyId || !keyword) throw new Error('Company name and keyword are required');
    if (!images || images.length === 0) throw new Error('At least one image is required');

    const NEST_API_URL = process.env.NEST_API_URL || 'http://localhost:3000';

    let businessData: any;
    try {
      const response = await axios.get(`${NEST_API_URL}/businesses/${companyId}`);
      businessData = response.data?.gmbData;
      if (!businessData) throw new Error('Missing gmbData from user record');
    } catch (error) {
      console.error('Error fetching user from Nest API:', error);
      throw new Error('Failed to retrieve business data');
    }
    console.log('Business data:', businessData);
    const imageUrls: string[] = [];

    for (const image of images) {
      const originalPath = image.path;
      const parsed = parse(originalPath);

      const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const jpegName = `${parsed.name}_${uniqueSuffix}.jpg`;
      const jpegPath = join(parsed.dir, jpegName);

      if (/\.(heic|heif)$/i.test(originalPath)) {
        await convertHeicToJpg(originalPath, jpegPath);
      } else {
        await sharp(originalPath).jpeg({ quality: 90 }).toFile(jpegPath);
      }

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
