import {
  IStorageRepository,
  IStorageRepositoryDownloadOptions,
  IStorageRepositoryGetImagesOptions,
  IStorageRepositoryRenameFileOptions,
  IStorageRepositoryUploadOptions,
} from 'src/domain/interfaces/storage.repository';

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

export class S3StorageService implements IStorageRepository {
  IMAGES_FOLDER = 'AI_IMAGES/';

  constructor(
    private readonly s3Client: S3Client,
    private readonly bucketName: string,
  ) {}

  async upload(params: IStorageRepositoryUploadOptions): Promise<string> {
    const { fileName, filePath, rootFolder } = params;
    const normalizedFileName = rootFolder + fileName.toLowerCase().replaceAll(' ', '_');
    const fileStream = fs.createReadStream(filePath); // or use fs.createReadStream if you're not using Bun

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: normalizedFileName,
      Body: fileStream,
      ContentType: 'image/jpeg',
    });

    try {
      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${normalizedFileName}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file');
    }
  }

  async download(params: IStorageRepositoryDownloadOptions): Promise<string> {
    const { fileName, rootFolder } = params;
    const key = rootFolder + fileName.toLowerCase().replaceAll(' ', '_');

    const headCommand = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(headCommand);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch {
      throw new Error(`File "${fileName}" not found in bucket.`);
    }
  }

  async listFolders(params: { prefix: string; rootFolder: string }): Promise<string[]> {
    const { prefix, rootFolder } = params;
    const fullPrefix = `${rootFolder}${prefix}`.replace(/\/+$/, '') + '/';

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: fullPrefix,
      Delimiter: '/',
    });

    const response = await this.s3Client.send(command);
    const folders = (response.CommonPrefixes || []).map((p) => p.Prefix?.replace(fullPrefix, '').replace(/\/$/, '') || '');

    console.log(`📂 listFolders: Found folders under "${fullPrefix}":`, folders);
    return folders;
  }

  async getImages(params: IStorageRepositoryGetImagesOptions): Promise<string[]> {
    const { prefix, rootFolder } = params;
    const fullPrefix = rootFolder + prefix.toLowerCase().replaceAll(' ', '_');

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: fullPrefix,
    });

    const response = await this.s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    return response.Contents.map((obj) => `https://${this.bucketName}.s3.amazonaws.com/${obj.Key}`);
  }

  async renameFile(params: IStorageRepositoryRenameFileOptions): Promise<void> {
    const { fileName, newFileName, rootFolder } = params;
    const oldKey = rootFolder + fileName;
    const newKey = rootFolder + newFileName;

    // Copy to new key
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${oldKey}`,
        Key: newKey,
        ACL: 'public-read',
      }),
    );

    // Delete old key
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: oldKey,
      }),
    );
  }

  async listImages(folder: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: folder,
    });

    const response = await this.s3Client.send(command);
    const urls = (response.Contents || []).map((obj) => `https://${this.bucketName}.s3.amazonaws.com/${obj.Key}`);

    console.log(`📂 [listImages] Fetched ${urls.length} image(s) from folder: ${folder}`);
    return urls;
  }

  getRelativePath = (urlOrPath: string): string => {
    const relative = urlOrPath.replace(`https://${this.bucketName}.s3.amazonaws.com/`, '');
    console.log(`🧭 [getRelativePath] Extracted relative path: ${relative}`);
    return relative;
  };

  async deleteImage(path: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: path,
        }),
      );
      console.log(`🗑️ [deleteImage] Deleted file: ${path}`);
    } catch (error) {
      console.warn(`⚠️ [deleteImage] Error deleting file: ${path}`, error);
      throw new Error(`File not found: ${path}`);
    }
  }
}
