import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignOfficerDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  officerId: number;
}
