import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 20)
  code: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHoursDefault?: number;
}
