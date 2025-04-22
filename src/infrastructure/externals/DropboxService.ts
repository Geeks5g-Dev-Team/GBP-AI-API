import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs-extra';
import { SaveImageDTO } from 'src/app/dtos/save-image.dto';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';

@Injectable()
export class DropboxService {
  private readonly CLIENT_ID = process.env.DROPBOX_CLIENT_ID!;
  private readonly CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET!;
  private readonly REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI!;
  private readonly NEST_API_URL = process.env.NEST_API_URL || 'http://localhost:3000';

  constructor(private readonly saveImageUseCase: SaveImageUseCase) {}

  getAuthUrl(userId: string): string {
    const base = 'https://www.dropbox.com/oauth2/authorize';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      token_access_type: 'offline',
      state: userId,
    });
    return `${base}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<any> {
    const res = await axios.post('https://api.dropboxapi.com/oauth2/token', null, {
      params: {
        code,
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        redirect_uri: this.REDIRECT_URI,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  }

  async refreshToken(refresh_token: string): Promise<string> {
    const res = await axios.post('https://api.dropboxapi.com/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token,
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data.access_token;
  }

  async getUserDropboxToken(accountId: string): Promise<string> {
    const user = (await axios.get(`${this.NEST_API_URL}/users/${accountId}`)).data;
    const tokenData = user.connectedAccounts?.find((acc: any) => acc.provider === 'dropbox')?.token;

    if (!tokenData) {
      throw new UnauthorizedException('Dropbox not connected for this user');
    }

    let accessToken = tokenData.access_token;
    const expiryDate = new Date(tokenData.expires_in);

    if (!accessToken || expiryDate.getTime() < Date.now()) {
      accessToken = await this.refreshToken(tokenData.refresh_token);
    }

    return accessToken;
  }

  async storeDropboxToken(accountId: string, rawToken: any): Promise<void> {
    const token = {
      access_token: rawToken.access_token,
      refresh_token: rawToken.refresh_token,
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      token_uri: 'https://api.dropboxapi.com/oauth2/token',
      expiry: new Date(Date.now() + (rawToken.expires_in || 14400) * 1000).toISOString(),
    };

    const newConnectedAccount = {
      provider: 'dropbox',
      accountId: accountId,
      token,
    };

    try {
      const user = (await axios.get(`${this.NEST_API_URL}/users/${accountId}`)).data;

      const connectedAccounts = Array.isArray(user.connectedAccounts) ? [...user.connectedAccounts] : [];

      const existingIndex = connectedAccounts.findIndex((acc) => acc.provider === 'dropbox');

      if (existingIndex >= 0) {
        connectedAccounts[existingIndex] = newConnectedAccount;
      } else {
        connectedAccounts.push(newConnectedAccount);
      }

      await axios.patch(`${this.NEST_API_URL}/users/${accountId}`, {
        connectedAccounts,
      });

      console.log(`✅ Dropbox token ${existingIndex >= 0 ? 'updated' : 'added'} for user ${accountId}`);
    } catch (error) {
      console.error('❌ Failed to update connectedAccounts:', error.response?.data || error.message);
      throw new Error('Could not update user with Dropbox token');
    }
  }

  async getFiles(accountId: string): Promise<any[]> {
    const accessToken = await this.getUserDropboxToken(accountId);

    const res = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      {
        path: '',
        recursive: true,
        include_non_downloadable_files: false,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const entries = res.data.entries;

    const filtered = entries.filter((entry) => entry['.tag'] === 'folder' || (entry['.tag'] === 'file' && entry.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)));

    return this.buildTreeFromPaths(filtered);
  }

  buildTreeFromPaths(entries: any[]): any[] {
    const root: any[] = [];

    for (const entry of entries) {
      const parts = entry.path_display.split('/').filter(Boolean);
      let current = root;

      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1;
        let node = current.find((item: any) => item.name === part);

        if (!node) {
          node = {
            name: part,
            id: entry.id,
            type: isLast ? entry['.tag'] : 'folder',
            path: entry.path_display,
            children: [],
            ...(isLast ? entry : {}),
          };
          current.push(node);
        }

        if (!isLast) current = node.children;
      });
    }

    return root;
  }

  async saveDropboxFiles(accountId: string, dto: SaveImageDTO & { paths: string[] }): Promise<string[]> {
    console.log('Saving Dropbox files 2:', dto);
    console.log(dto);
    const { paths, companyId, keyword, markAsUsed } = dto;
    console.log('Paths:', paths);
    const accessToken = await this.getUserDropboxToken(accountId);
    const images: Express.Multer.File[] = [];

    for (const path of paths) {
      try {
        const res = await axios.post('https://content.dropboxapi.com/2/files/download', null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({ path }),
            'Content-Type': '',
          },
          responseType: 'arraybuffer',
        });

        const fileName = `${Date.now()}_${path.split('/').pop()}`;
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

        console.error('❌ Dropbox download error:', message || error.message);
        throw new Error(`Dropbox download failed for "${path}"`);
      }
    }

    return await this.saveImageUseCase.execute({ companyId, keyword, markAsUsed }, images);
  }
}
