import { BadRequestException, Body, Controller, Delete, Get, Post, Query, Request, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';

import { GenerateImageOfServiceDto } from 'src/app/dtos/generate-image-of-service.dto';
import { SaveImageDTO } from 'src/app/dtos/save-image.dto';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';

@Controller('generator')
export class GeneratorController {
  constructor(
    private readonly generateImageOfServiceUseCase: GenerateImageOfServiceUseCase,
    private readonly saveImageUseCase: SaveImageUseCase,
    private readonly storageService: GoogleStorageService,
  ) {}

  @Post('image-of-service')
  async generateImageOfService(@Body() bodyDto: GenerateImageOfServiceDto, @Request() req: any): Promise<{ url: string; postPrompt?: string }> {
    const [postPrompt, , uploadUrl] = await this.generateImageOfServiceUseCase.execute(bodyDto);
    return { url: uploadUrl, postPrompt };
  }

  @Post('save-image')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      fileFilter: (req, file, cb) => {
        // const isImage = file.mimetype.startsWith('image/');
        // if (!isImage) {
        //   return cb(new BadRequestException('Only image files are allowed!'), false);
        // }
        cb(null, true);
      },
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          const finalName = `${randomUUID()}${extension}`;
          cb(null, finalName);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', example: '12121151872725055808' },
        keyword: { type: 'string', example: 'scooter rental' },
        markAsUsed: {
          type: 'boolean',
          description: 'Mark as used (empty for false)',
          example: true,
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['companyId', 'keyword', 'images'],
    },
  })
  async saveImage(@Body() bodyDto: SaveImageDTO, @UploadedFiles() files: Express.Multer.File[]): Promise<{ urls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    const { companyId, keyword, markAsUsed } = bodyDto;
    const keywordSanitized = keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const imageUrls = await this.saveImageUseCase.execute(
      {
        companyId,
        keyword: keywordSanitized,
        markAsUsed,
      },
      files,
    );

    return { urls: imageUrls };
  }

  @Get('list-images')
  @ApiQuery({ name: 'folder', required: true, description: 'Relative folder path, e.g., 12121151872725055808/scooter rental' })
  async listImages(@Query('folder') folder: string): Promise<{ images: string[] }> {
    if (!folder) {
      throw new BadRequestException('Folder path is required');
    }

    const normalized = folder.startsWith('CLIENT_IMAGES/') ? folder.replace(/^CLIENT_IMAGES\//i, '') : folder;
    const sanitized = normalized.toLowerCase().replace(/[^a-z0-9/]/g, '_');
    const fullPath = `CLIENT_IMAGES/${sanitized}/`;
    const cleanPath = fullPath.replace(/\/{2,}/g, '/').replace(/\/?$/, '/');

    const images = await this.storageService.listImages(cleanPath);
    return { images };
  }

  @Delete('delete-image')
  @ApiQuery({ name: 'path', required: true, description: 'Full path of image in bucket, e.g., CLIENT_IMAGES/companyId/keyword/image.jpg' })
  async deleteImage(@Query('path') path: string): Promise<{ message: string }> {
    const relativePath = this.storageService.getRelativePath(path);
    await this.storageService.deleteImage(relativePath);
    return { message: 'Image deleted successfully' };
  }

  @Delete('delete-images')
  async deleteImages(@Query('paths') paths: string): Promise<{ deleted: string[] }> {
    if (!paths) {
      throw new BadRequestException('Missing image paths');
    }

    const decodedPaths = decodeURIComponent(paths)
      .split(',')
      .map((p) => this.storageService.getRelativePath(p.trim()));

    const deleted: string[] = [];
    for (const path of decodedPaths) {
      try {
        await this.storageService.deleteImage(path);
        deleted.push(path);
      } catch (err) {
        console.error(`Failed to delete ${path}:`, err.message);
      }
    }

    return { deleted };
  }
}
