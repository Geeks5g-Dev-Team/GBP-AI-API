import * as fs from 'fs-extra';
import * as path from 'path';
import * as sharp from 'sharp';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { IIAGeneratorRepository, SIZE_OPTIONS } from 'src/domain/interfaces/IAGenerator.repository';

export class GrokService implements IIAGeneratorRepository {
  model: string;

  constructor(
    private readonly apiKey: string,
    private readonly downloadPath: string,
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
  private async downloadAndCropImage(imageUrl: string, cropHeight: number = 100): Promise<string> {
    // Generate unique filename
    const filename = `${uuidv4()}.jpg`;
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

      // Crop image
      await sharp(tempDownloadPath)
        .resize({
          width: metadata.width,
          height: metadata.height ? metadata.height - cropHeight : undefined,
        })
        .toFile(finalImagePath);

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

  async generateImage(prompt: string, number_images: number, size: SIZE_OPTIONS): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Grok API key is not set in environment variables.');
    }

    console.log(prompt);
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
    console.log(data);

    if (!response.ok) {
      const error = data;
      throw new Error(`Grok API error: ${error.error.message}`);
    }

    // Get image URL and download/crop
    const imageUrl = data.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL received from Grok API');
    }

    // Download and crop image, return local path
    return this.downloadAndCropImage(imageUrl);
  }
}
