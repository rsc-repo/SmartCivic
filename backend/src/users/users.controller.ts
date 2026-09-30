import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin-only: e.g. populating an "assign officer" dropdown with
  // ?role=OFFICER. passwordHash is stripped globally by
  // ClassSerializerInterceptor (see main.ts), so this is safe to expose.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEPT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Get()
  findAll(@Query() query: FindUsersQueryDto) {
    return query.role
      ? this.usersService.findByRole(query.role)
      : this.usersService.findAll();
  }
}
