import { Body, Controller, Get, Post, Request, StreamableFile } from '@nestjs/common';
import { GenerateImageOfServiceDto } from 'src/app/dtos/generate-image-of-service.dto';
import { GenerateImageOfServiceUseCase } from 'src/app/use-cases/generate-image-of-service.use-case';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('generator')
export class GeneratorController {
  constructor(private readonly generateImageOfServiceUseCase: GenerateImageOfServiceUseCase) {}

  @Post('image-of-service')
  async generateImageOfService(@Body() bodyDto: GenerateImageOfServiceDto, @Request() req: any): Promise<StreamableFile> {
    const [imagePath] = await this.generateImageOfServiceUseCase.execute(bodyDto);
    // split by \
    const imageName = imagePath.split('\\').pop();
    const file = createReadStream(join(process.cwd(), `downloads/images/${imageName}`));
    return new StreamableFile(file, {
      disposition: `attachment; filename=${bodyDto.companyName.replace(' ', '')}_${bodyDto.businessType.replace(' ', '')}.jpg`,
      type: 'image/jpg',
    });
  }
}
