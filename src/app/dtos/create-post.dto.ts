import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { GenerateImageOfServiceDto } from './generate-image-of-service.dto';

export class CreatePostDto {
  @ApiProperty({ description: 'Content of the post', example: 'This is a sample post' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'prompt to generate the image of the post',
    example:
      'A modern, minimalist coffee shop interior with wooden furniture, soft ambient lighting, and a cozy atmosphere, designed for business meetings and remote work. High-quality product showcase with fresh coffee beans and pastries on the counter. No people present, clean and realistic composition.',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({
    description: 'ID of the page where the post will be published',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({ description: 'Access token for authentication', example: 'EAABsbCS1i...' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: 'Indicates if the post should be published on Facebook',
    example: true,
  })
  @IsBoolean()
  publishToFacebook: boolean;

  @ApiProperty({
    description: 'Indicates if the post should be published on Facebook Now',
    example: true,
  })
  @IsBoolean()
  publishNow: boolean;

  @ApiProperty({
    description: 'If publishNow is false, this field should contain the scheduled publish time in unix timestamp format',
    example: 1893456000,
  })
  @IsString()
  @IsOptional()
  // @Min(Math.floor(Date.now() / 1000) + 1, { message: 'The timestamp must be in the future' })
  scheduledPublishTime?: string;

  @ApiProperty({
    description: 'Indicates if the post should be published on Instagram',
    example: false,
  })
  @IsBoolean()
  publishToInstagram: boolean;

  @ApiProperty({ description: 'Company Name', example: 'Tech Solutions Inc.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Service Name', example: 'Installation & Repair Company' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  // BOOLEAN TO GENERATE NEW IMAGE
  @ApiProperty({ description: 'Indicates if a new image should be generated', example: true })
  @IsBoolean()
  @IsOptional()
  generateNewImage: boolean;

  // OBJECT TO GENERATE IMAGES
  @ApiProperty({ type: GenerateImageOfServiceDto })
  @IsOptional()
  generateImageOfServiceDto?: GenerateImageOfServiceDto;
}
