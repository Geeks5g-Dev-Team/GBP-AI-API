import { Body, Controller, Get, Post, Request, StreamableFile } from '@nestjs/common';
import { GenerateImageOfServiceDto } from 'src/app/dtos/generate-image-of-service.dto';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('generator')
export class GeneratorController {
  constructor(private readonly generateImageOfServiceUseCase: GenerateImageOfServiceUseCase) {}

  @Post('image-of-service')
  async generateImageOfService(@Body() bodyDto: GenerateImageOfServiceDto, @Request() req: any): Promise<{ url: string }> {
    const [, uploadUrl] = await this.generateImageOfServiceUseCase.execute(bodyDto);
    return { url: uploadUrl };
  }
}
