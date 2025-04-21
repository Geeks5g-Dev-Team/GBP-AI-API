import * as fs from 'fs-extra';
import * as path from 'path';
import * as sharp from 'sharp';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from './firebaseService';
import { exiftool } from 'exiftool-vendored';
import { IIAGeneratorRepository } from 'src/domain/interfaces/IAGenerator.repository';
import { ExifService } from './utils/exif.service';

export class GrokService implements IIAGeneratorRepository {
  model: string;

  constructor(
    private readonly apiKey: string,
    private readonly downloadPath: string,
    private readonly firestoreService: FirestoreService,
    private readonly exifService: ExifService,
  ) {
    this.model = 'grok-2-image';
    // Use NestJS's approach to determine download path
    this.downloadPath = path.join(process.cwd(), 'downloads', 'images');

    // Ensure download directory exists using fs-extra
    this.ensureDownloadDirectory();
  }

  /**
   * Ensure download directory exists
   */
  private ensureDownloadDirectory(): void {
    try {
      fs.ensureDirSync(this.downloadPath);
    } catch (error) {
      console.error('Failed to create download directory:', error);
    }
  }

  /**
   * Download and crop image to remove watermark
   * @param imageUrl URL of the image to download
   * @param cropHeight Height to crop from bottom (default 100 pixels)
   * @returns Local path of the cropped image
   */
  private async downloadAndCropImage(imageUrl: string, locationId: string, cropHeight: number = 100): Promise<string> {
    // Generate filename using dd_mm_yyyy format
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `${timestamp}_used.jpg`;

    const tempDownloadPath = path.join(this.downloadPath, `temp_${filename}`);
    const finalImagePath = path.join(this.downloadPath, filename);

    try {
      // Download image
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
      });

      // Save original image
      await fs.writeFile(tempDownloadPath, response.data);

      // Get image metadata
      const metadata = await sharp(tempDownloadPath).metadata();

      const NEST_API_URL = process.env.NEST_API_URL || 'http://localhost:3000';

      let businessData: any;
      try {
        const response = await axios.get(`${NEST_API_URL}/businesses/${locationId}`);
        businessData = response.data?.gmbData;
        if (!businessData) throw new Error('Missing gmbData from user record');
      } catch (error) {
        console.error('Error fetching user from Nest API:', error);
        throw new Error('Failed to retrieve business data');
      }
      console.log('Business data:', businessData);

      // Crop image
      await sharp(tempDownloadPath)
        .resize({
          width: metadata.width,
          height: metadata.height ? metadata.height - cropHeight : undefined,
        })
        .jpeg({ quality: 90 })
        .toFile(finalImagePath);

      await this.exifService.addPhoneExifMetadata(finalImagePath, businessData);

      const meta = await exiftool.read(finalImagePath);
      console.log('🔍 EXIF metadata from exiftool:', meta);

      // Remove temporary file
      await fs.unlink(tempDownloadPath);

      return finalImagePath;
    } catch (error) {
      console.error('Error downloading or cropping image:', error);

      // Clean up temporary file if it exists
      if (await fs.pathExists(tempDownloadPath)) {
        await fs.unlink(tempDownloadPath);
      }

      throw new Error(`Failed to download and crop image: ${error.message}`);
    }
  }

  async generateImage(prompt: string, number_images: number, locationId: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('Grok API key is not set in environment variables.');
      }

      const response = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          n: number_images,
          response_format: 'url',
          model: this.model,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const error = data;
        console.log(error);
        throw new Error(`Grok API error: ${error.error.message}`);
      }

      // Get image URL and download/crop
      const imageUrl = data.data[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL received from Grok API');
      }

      // Download and crop image, return local path
      return await this.downloadAndCropImage(imageUrl, locationId);
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  async deleteImage(imagePath: string): Promise<void> {
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
}
