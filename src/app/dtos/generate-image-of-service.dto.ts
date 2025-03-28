import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Min, IsNumber, IsEnum } from 'class-validator';
import { SIZE_OPTIONS } from 'src/domain/interfaces/IAGenerator.repository';

export class GenerateImageOfServiceDto {
  @ApiProperty({ description: 'Business Type', example: 'Installation & Repair Company' })
  @IsString()
  @IsNotEmpty()
  businessType: string;

  @ApiProperty({ description: 'Main Service', example: 'Professional Installation and Repair Services' })
  @IsString()
  @IsNotEmpty()
  mainService: string;

  // country
  @ApiProperty({ description: 'Country', example: 'USA' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Image Composition Guidelines: Style of the image', example: 'Technical and Professional' })
  @IsString()
  @IsNotEmpty()
  styleImage: string;

  @ApiProperty({ description: 'Image Composition Guidelines: Mood', example: 'Trustworthy, Reliable, Competent', default: 'Trustworthy, Reliable, Competent' })
  @IsString()
  @IsNotEmpty()
  mood: string;

  @ApiProperty({ description: 'Key Elements to Include', example: 'Technicians working on installations, tools and equipment, service vehicles' })
  @IsString()
  @IsNotEmpty()
  key_elements: string;

  @ApiProperty({ description: 'Preferred Aesthetic: Lighting', example: 'Bright worksite Lighting' })
  @IsString()
  @IsNotEmpty()
  aesthetic_lighting: string;

  @ApiProperty({ description: 'Preferred Aesthetic: Perspective', example: 'Wide shot showing team at work' })
  @IsString()
  @IsNotEmpty()
  aesthetic_perspective: string;

  @ApiProperty({ description: 'Preferred Aesthetic: Color Palette', example: 'Bright and Professional' })
  @IsString()
  aesthetic_color_palette: string;

  @ApiProperty({ description: 'Preferred Aesthetic: Texture and Details', example: 'Smooth and polished surfaces' })
  @IsString()
  aesthetic_texture_details: string;

  @ApiProperty({ description: 'Additional Context to put in te image  Composition', example: 'Branded uniforms, modern equipment, clean work environment' })
  @IsString()
  @IsNotEmpty()
  additional_context: string;

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
  @ApiProperty({ description: 'Company Name', example: 'Tech Solutions Inc.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;
}
