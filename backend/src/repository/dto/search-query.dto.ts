import { IsNotEmpty, IsOptional, IsString, IsISO8601, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

const ALLOWED_PER_PAGE = [10, 30, 50, 100];

export class SearchQueryDto {
  @IsNotEmpty({ message: 'language is required' })
  @IsString()
  language: string;

  @IsOptional()
  @IsISO8601({}, { message: 'createdAfter must be a valid ISO 8601 date' })
  createdAfter?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsIn(ALLOWED_PER_PAGE, { message: 'perPage must be one of: 10, 30, 50, 100' })
  perPage?: number = 30;
}
