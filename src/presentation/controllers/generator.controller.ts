import { BadRequestException, Body, Controller, Get, Post, Request, StreamableFile, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { GenerateImageOfServiceDto } from 'src/app/dtos/generate-image-of-service.dto';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { createReadStream } from 'fs';
import { join } from 'path';
import { SaveImageDTO } from 'src/app/dtos/save-image.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';

@Controller('generator')
export class GeneratorController {
  constructor(
    private readonly generateImageOfServiceUseCase: GenerateImageOfServiceUseCase,
    private readonly saveImageUseCase: SaveImageUseCase,
  ) {}

  @Post('image-of-service')
  async generateImageOfService(@Body() bodyDto: GenerateImageOfServiceDto, @Request() req: any): Promise<{ url: string; revisedPrompt?: string }> {
    const [revisedPrompt, , uploadUrl] = await this.generateImageOfServiceUseCase.execute(bodyDto);
    return { url: uploadUrl, revisedPrompt };
  }

  @Post('save-image')
  @UseInterceptors(FilesInterceptor('images', 10)) // 10 es el número máximo de archivos, ajústalo según necesites
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', example: 'Tech Solutions Inc.' },
        serviceName: { type: 'string', example: 'Installation & Repair Company' },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        markAsUsed: { type: 'boolean', description: 'Mark as used (empty for false)', example: true },
      },
      required: ['companyName', 'serviceName', 'images'],
    },
  })
  async saveImage(@Body() bodyDto: SaveImageDTO, @UploadedFiles() files: Express.Multer.File[]): Promise<{ urls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Image file is required');
    }

    const { companyName, serviceName, markAsUsed } = bodyDto;
    const companyNameSanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const serviceNameSanitized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    // Ahora pasamos el archivo separado del DTO
    const imageUrls = await this.saveImageUseCase.execute({
      companyName: companyNameSanitized,
      serviceName: serviceNameSanitized,
      images: files,
      markAsUsed,
    });
    return { urls: imageUrls };
  }
}
