import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Min, IsNumber, IsEnum, IsOptional, IsArray } from 'class-validator';

export class SaveImageDTO {
  @ApiProperty({ description: 'Company Id', example: '10198908623236828356' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'Keyword', example: 'Installation & Repair Company' })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({ description: 'Mark as used', example: true })
  @IsOptional()
  markAsUsed?: boolean;
}
