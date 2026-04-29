import { IsNotEmpty, IsOptional, IsString, IsISO8601, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ALLOWED_PER_PAGE = [10, 30, 50, 100];

export class SearchQueryDto {
  @ApiProperty({ description: 'Programming language to search for', example: 'typescript' })
  @IsNotEmpty({ message: 'language is required' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Only repos created on or after this date (ISO 8601)', example: '2024-01-01' })
  @IsOptional()
  @IsISO8601({}, { message: 'createdAfter must be a valid ISO 8601 date' })
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Number of results to fetch', enum: ALLOWED_PER_PAGE, default: 30 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsIn(ALLOWED_PER_PAGE, { message: 'perPage must be one of: 10, 30, 50, 100' })
  perPage?: number = 30;
}
