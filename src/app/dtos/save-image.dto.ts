import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Min, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class SaveImageDTO {
  @ApiProperty({ description: 'Company Name', example: '10198908623236828356' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'Service name', example: 'Installation & Repair Company' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({ description: 'Mark as used', example: true })
  @IsOptional()
  markAsUsed?: boolean;
}
