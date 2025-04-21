import { Injectable } from '@nestjs/common';
import { exiftool } from 'exiftool-vendored';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';

@Injectable()
export class ExifService {
  private randomDateInPast30Days(): string {
    const now = new Date();
    const past = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    return `${past.getFullYear()}:${String(past.getMonth() + 1).padStart(2, '0')}:${String(past.getDate()).padStart(2, '0')} ${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}:${String(past.getSeconds()).padStart(2, '0')}`;
  }

  async addPhoneExifMetadata(imagePath: string, businessData: any): Promise<string> {
    try {
      await exiftool.write(imagePath, {
        Make: 'Apple',
        Model: 'iPhone 13 Pro',
        Software: 'iOS 16.4.1',
        Artist: businessData.name || 'Unknown',
        DateTimeOriginal: this.randomDateInPast30Days(),
        UserComment: businessData.storeFrontAddress?.addressLines?.[0] || 'Unknown address',
        Comment: businessData.storeFrontAddress?.addressLines?.[0] || 'Unknown address',
        ImageDescription: businessData.profile?.description || 'No description available',
        Description: businessData.profile?.description || 'No description available',
        GPSLatitude: businessData.latlng?.latitude || 37.7749,
        GPSLongitude: businessData.latlng?.longitude || -122.4194,
        GPSAltitude: 15.3,
        Copyright: `© ${businessData.name}, ${new Date().getFullYear()}. All rights reserved.`,
      });

      console.log('✅ Metadata written to image:', imagePath);
      return imagePath;
    } catch (error) {
      console.error('❌ Failed to write EXIF metadata:', error);
      throw error;
    }
  }
}
