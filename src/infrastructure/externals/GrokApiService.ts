import * as fs from 'fs-extra';
import * as path from 'path';
import * as sharp from 'sharp';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from './firebaseService';
import { exiftool } from 'exiftool-vendored';

import { IIAGeneratorRepository } from 'src/domain/interfaces/IAGenerator.repository';

export class GrokService implements IIAGeneratorRepository {
  model: string;

  constructor(
    private readonly apiKey: string,
    private readonly downloadPath: string,
    private readonly firestoreService: FirestoreService,
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

  private async addPhoneExifMetadata(imagePath: string, businessData: any): Promise<void> {
    function randomDateInPast30Days() {
      const now = new Date();
      const past = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      return `${past.getFullYear()}:${String(past.getMonth() + 1).padStart(2, '0')}:${String(past.getDate()).padStart(2, '0')} ${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}:${String(past.getSeconds()).padStart(2, '0')}`;
    }

    try {
      await exiftool.write(imagePath, {
        Make: 'Apple',
        Model: 'iPhone 13 Pro',
        Software: 'iOS 16.4.1',
        Artist: businessData.title || 'Unknown',
        DateTimeOriginal: randomDateInPast30Days(),
        UserComment: businessData.storeFrontAddress?.addressLines[0] || 'Unknown address',
        Comment: businessData.storeFrontAddress?.addressLines[0] || 'Unknown address',
        ImageDescription: businessData.profile?.description || 'Unknown address',
        Description: businessData.profile?.description || 'No description available',
        GPSLatitude: businessData.geometry?.location?.lat || 37.7749,
        GPSLongitude: businessData.geometry?.location?.lng || -122.4194,
        GPSAltitude: 15.3,
        Copyright: `© ${businessData.title}, 2025. All rights reserved.`,
      });
      console.log('📸 Metadata written with exiftool-vendored');
    } catch (error) {
      console.error('Failed to write EXIF metadata with exiftool-vendored:', error);
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

      console.log(locationId);

      const businessData = await this.firestoreService.getDocument('businesses', locationId);

      // Crop image
      await sharp(tempDownloadPath)
        .resize({
          width: metadata.width,
          height: metadata.height ? metadata.height - cropHeight : undefined,
        })
        .jpeg({ quality: 90 })
        .toFile(finalImagePath);

      await this.addPhoneExifMetadata(finalImagePath, businessData);

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
