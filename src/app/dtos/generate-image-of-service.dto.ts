import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Min, IsNumber, IsEnum } from 'class-validator';
import { SIZE_OPTIONS } from 'src/domain/interfaces/IAGenerator.repository';

export class GenerateImageOfServiceDto {
  @ApiProperty({ description: 'Service name', example: 'Installation & Repair Company' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  // number of images
  @ApiProperty({ description: 'Number of images to generate', example: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  numberOfImages: number;

  @ApiProperty({ description: 'Size of the image', example: '1024x1024', enum: SIZE_OPTIONS })
  @IsEnum(SIZE_OPTIONS)
  @IsNotEmpty()
  size: SIZE_OPTIONS;

  // company name
  @ApiProperty({ description: 'Company Name', example: '10198908623236828356' })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
