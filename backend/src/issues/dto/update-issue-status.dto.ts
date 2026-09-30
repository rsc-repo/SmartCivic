import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IssueStatus } from '../../common/enums';

// Sent as multipart/form-data when status is RESOLVED (to allow attaching
// repair-evidence photos alongside it) and as JSON otherwise; class-validator
// doesn't care which, both arrive the same way once parsed.
export class UpdateIssueStatusDto {
  @IsEnum(IssueStatus)
  status: IssueStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}
