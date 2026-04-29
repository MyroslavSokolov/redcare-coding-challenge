import { IsNotEmpty, IsOptional, IsString, IsISO8601 } from 'class-validator';

export class SearchQueryDto {
  @IsNotEmpty({ message: 'language is required' })
  @IsString()
  language: string;

  @IsOptional()
  @IsISO8601({}, { message: 'createdAfter must be a valid ISO 8601 date' })
  createdAfter?: string;
}
