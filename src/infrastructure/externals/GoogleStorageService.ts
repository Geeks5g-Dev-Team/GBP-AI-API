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

  async listFolders(params: { prefix: string; rootFolder: string }): Promise<string[]> {
    const { prefix, rootFolder } = params;
    const bucket = this.storage.bucket(this.bucketName);
    const fullPrefix = `${rootFolder}${prefix}`.replace(/\/+$/, '') + '/'; // ensure single trailing slash

    const [files, , apiResponse] = await bucket.getFiles({
      prefix: fullPrefix,
      delimiter: '/',
      autoPaginate: false,
    });

    const prefixes = (apiResponse as { prefixes?: string[] }).prefixes || [];
    const folders = prefixes.map((p) => {
      const relative = p.replace(fullPrefix, '').replace(/\/$/, ''); // remove root prefix and trailing slash
      return relative;
    });

    console.log(`📂 listFolders: Found folders under "${fullPrefix}":`, folders);
    return folders;
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

  async listImages(folder: string): Promise<string[]> {
    const bucket = this.storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix: folder });

    const urls = files.map((file) => `https://storage.googleapis.com/${this.bucketName}/${file.name}`);
    console.log(`📂 [listImages] Fetched ${urls.length} image(s) from folder: ${folder}`);
    return urls;
  }

  getRelativePath = (urlOrPath: string): string => {
    const relative = urlOrPath.replace(`https://storage.googleapis.com/${this.bucketName}/`, '');
    console.log(`🧭 [getRelativePath] Extracted relative path: ${relative}`);
    return relative;
  };

  async deleteImage(path: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`⚠️ [deleteImage] File not found in bucket: ${path}`);
      throw new Error(`File not found: ${path}`);
    }

    await file.delete();
    console.log(`🗑️ [deleteImage] Deleted file: ${path}`);
  }
}
