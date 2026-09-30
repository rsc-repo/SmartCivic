import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../common/enums';

export class FindUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
