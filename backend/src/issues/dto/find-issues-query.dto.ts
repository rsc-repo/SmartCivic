import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { IssueStatus } from '../../common/enums';

export class FindIssuesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedOfficerId?: number;

  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;
}
