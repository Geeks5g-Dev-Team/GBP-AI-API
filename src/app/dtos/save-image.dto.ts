import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Min, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class SaveImageDTO {
  @ApiProperty({ description: 'Company Name', example: 'Tech Solutions Inc.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Service name', example: 'Installation & Repair Company' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({ description: 'Mark as used', example: true })
  @IsOptional()
  markAsUsed?: boolean;
}
