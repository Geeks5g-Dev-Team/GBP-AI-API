import { BadRequestException, Body, Controller, Get, Post, Request, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { GenerateImageOfServiceDto } from 'src/app/dtos/generate-image-of-service.dto';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { createReadStream } from 'fs';
import { join } from 'path';
import { SaveImageDTO } from 'src/app/dtos/save-image.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SaveImageUseCase } from 'src/app/use-cases/save-image.use-case';

@Controller('generator')
export class GeneratorController {
  constructor(
    private readonly generateImageOfServiceUseCase: GenerateImageOfServiceUseCase,
    private readonly saveImageUseCase: SaveImageUseCase,
  ) {}

  @Post('image-of-service')
  async generateImageOfService(@Body() bodyDto: GenerateImageOfServiceDto, @Request() req: any): Promise<{ url: string }> {
    const [, uploadUrl] = await this.generateImageOfServiceUseCase.execute(bodyDto);
    return { url: uploadUrl };
  }

  @Post('save-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', example: 'Tech Solutions Inc.' },
        serviceName: { type: 'string', example: 'Installation & Repair Company' },
        image: { type: 'string', format: 'binary' },
      },
      required: ['companyName', 'serviceName', 'image'],
    },
  })
  async saveImage(@Body() bodyDto: SaveImageDTO, @UploadedFile() file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const { companyName, serviceName } = bodyDto;
    // Ahora pasamos el archivo separado del DTO
    const imagePath = await this.saveImageUseCase.execute({
      companyName,
      serviceName,
      image: file,
    });

    return { url: imagePath };
  }
}
