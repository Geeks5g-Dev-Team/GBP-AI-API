import {
  IStorageRepository,
  IStorageRepositoryDownloadOptions,
  IStorageRepositoryGetImagesOptions,
  IStorageRepositoryRenameFileOptions,
  IStorageRepositoryUploadOptions,
} from 'src/domain/interfaces/storage.repository';
import { Storage } from '@google-cloud/storage';

export class GoogleStorageService implements IStorageRepository {
  IMAGES_FOLDER = 'IA_IMAGES/';
  constructor(
    private readonly storage: Storage,
    private readonly bucketName: string,
  ) {}
  async upload(params: IStorageRepositoryUploadOptions): Promise<string> {
    try {
      const { fileName, filePath, rootFolder } = params;
      const bucket = this.storage.bucket(this.bucketName);
      const result = await bucket.upload(filePath, {
        destination: rootFolder + fileName.toLocaleLowerCase().replaceAll(' ', '_'),
        public: true,
        metadata: {
          contentType: 'image/jpg',
        },
      });
      if (result[0].metadata.mediaLink === undefined) {
        throw new Error('File not found');
      }
      return `https://storage.googleapis.com/${this.bucketName}/${rootFolder + fileName.toLocaleLowerCase().replaceAll(' ', '_')}`;
    } catch (error) {
      console.error('Error uploading file to Google Cloud Storage:', error);
      throw new Error('Failed to upload file');
    }
  }
  async download(params: IStorageRepositoryDownloadOptions): Promise<string> {
    const { fileName, rootFolder } = params;
    const bucket = this.storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({
      prefix: rootFolder + fileName.toLocaleLowerCase().replaceAll(' ', '_'),
    });
    if (files.length === 0) {
      throw new Error(`File "${fileName}" not found in bucket.`);
    }
    return `https://storage.googleapis.com/${this.bucketName}/${files[0].name}`;
  }

  async getImages(params: IStorageRepositoryGetImagesOptions): Promise<string[]> {
    const { prefix, rootFolder } = params;
    const bucket = this.storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({
      prefix: rootFolder + prefix.toLocaleLowerCase().replaceAll(' ', '_'),
      // maxResults: limit,
    });
    if (files.length === 0) {
      return [];
    }
    return files.map((file) => `https://storage.googleapis.com/${this.bucketName}/${file.name}`);
  }

  async renameFile(params: IStorageRepositoryRenameFileOptions): Promise<void> {
    const { fileName, newFileName, rootFolder } = params;
    const bucket = this.storage.bucket(this.bucketName);
    await bucket.file(rootFolder + fileName).rename(rootFolder + newFileName);
  }
}
