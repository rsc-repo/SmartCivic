import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

// Sent as multipart/form-data alongside the "media" file field(s), so all
// scalar values arrive as strings and are coerced via class-transformer
// (ValidationPipe has transform: true globally — see main.ts).
export class CreateIssueDto {
  @IsString()
  @Length(3, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Length(2, 50)
  category: string;

  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsString()
  addressText?: string;

  // Optional: citizen can suggest a department; final routing/triage
  // happens in Phase 5 (officer workflow).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;
}
