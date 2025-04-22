import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs-extra';
import { SaveImageDTO } from 'src/app/dtos/save-image.dto';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';

@Injectable()
export class GoogleDriveService {
  constructor(private readonly saveImageUseCase: SaveImageUseCase) {}

  private readonly NEST_API_URL = process.env.NEST_API_URL || 'http://localhost:3000';

  buildDriveTree(files: any[], parentId: string = 'root'): any[] {
    return files
      .filter((file) => (file.parents?.[0] || 'root') === parentId)
      .map((file) => {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        return {
          ...file,
          mimeType: isFolder ? 'folder' : file.mimeType,
          children: isFolder ? this.buildDriveTree(files, file.id) : undefined,
        };
      });
  }

  async refreshAccessTokenFromStoredData(tokenData: any): Promise<string> {
    const { refresh_token, client_id, client_secret, token_uri = 'https://oauth2.googleapis.com/token' } = tokenData;

    if (!refresh_token || !client_id || !client_secret) {
      throw new Error('Missing credentials required to refresh token');
    }

    try {
      const res = await axios.post(token_uri, null, {
        params: {
          client_id,
          client_secret,
          refresh_token,
          grant_type: 'refresh_token',
        },
      });

      return res.data.access_token;
    } catch (err) {
      console.error('🔁 Error refreshing token:', err.response?.data || err.message);
      throw new Error('Unable to refresh access token');
    }
  }

  async getFiles(accountId: string): Promise<any[]> {
    const user = await axios.get(`${this.NEST_API_URL}/users/${accountId}`);
    const tokenData = user.data.connectedAccounts?.[0]?.token;
    let accessToken = tokenData.token;

    const expiryDate = new Date(tokenData.expiry);
    if (!accessToken || expiryDate.getTime() < Date.now()) {
      accessToken = await this.refreshAccessTokenFromStoredData(tokenData);
    }

    const allFiles: any[] = [];

    // 1. Fetch all folders
    let pageToken: string | undefined;
    do {
      const res = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          fields: 'nextPageToken, files(id,name,mimeType,parents)',
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        },
      });
      allFiles.push(...(res.data.files || []));
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    // 2. Fetch all image files
    pageToken = undefined;
    do {
      const res = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          q: "mimeType contains 'image/' and trashed = false",
          fields: 'nextPageToken, files(id,name,mimeType,parents,modifiedTime)',
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        },
      });
      allFiles.push(...(res.data.files || []));
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    return this.buildDriveTree(allFiles);
  }

  async saveDriveFiles(accountId: string, dto: SaveImageDTO & { driveFileIds: string[] }): Promise<string[]> {
    const { driveFileIds, keyword, companyId, markAsUsed } = dto;

    // Get token
    const user = (await axios.get(`${this.NEST_API_URL}/users/${accountId}`)).data;
    const tokenData = user.connectedAccounts?.[0]?.token;
    let accessToken = tokenData.token;

    const expiryDate = new Date(tokenData.expiry);
    if (!accessToken || expiryDate.getTime() < Date.now()) {
      accessToken = await this.refreshAccessTokenFromStoredData(tokenData);
    }

    const images: Express.Multer.File[] = [];

    for (const fileId of driveFileIds) {
      try {
        const res = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        });

        const fileName = `${fileId}_${Date.now()}.jpg`;
        const filePath = `./downloads/${fileName}`;
        await fs.outputFile(filePath, res.data);

        images.push({
          path: filePath,
          originalname: fileName,
          mimetype: 'image/jpeg',
          size: res.data.length,
          fieldname: 'file',
          buffer: null,
          stream: null,
          destination: '',
          filename: fileName,
        } as unknown as Express.Multer.File);
      } catch (error) {
        const message = Buffer.isBuffer(error.response?.data) ? error.response.data.toString('utf-8') : error.response?.data || error.message;

        console.error('❌ Drive download error:', message || error.message);
        throw new Error(`Google Drive download failed for "${fileId}"`);
      }
    }

    return await this.saveImageUseCase.execute({ companyId, keyword, markAsUsed }, images);
  }
}
