import { BadRequestException, Body, Controller, Get, Post, Request, StreamableFile, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { GenerateImageOfServiceDto } from 'src/app/dtos/generate-image-of-service.dto';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SaveImageDTO } from 'src/app/dtos/save-image.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';
import { randomUUID } from 'crypto';

@Controller('generator')
export class GeneratorController {
  constructor(
    private readonly generateImageOfServiceUseCase: GenerateImageOfServiceUseCase,
    private readonly saveImageUseCase: SaveImageUseCase,
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
        const isImage = file.mimetype.startsWith('image/');
        if (!isImage) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
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

    const companyIdSanitized = companyId.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const keywordSanitized = keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const imageUrls = await this.saveImageUseCase.execute(
      {
        companyId: companyIdSanitized,
        keyword: keywordSanitized,
        markAsUsed,
      },
      files,
    );

    return { urls: imageUrls };
  }
}
