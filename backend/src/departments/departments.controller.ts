import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // Public read — anyone (including anonymous citizens) can see the list
  // of departments, e.g. to populate a category dropdown when reporting
  // an issue.
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  // Admin-only write, demonstrating JwtAuthGuard + RolesGuard together:
  // requires a valid token AND one of the listed roles.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DEPT_ADMIN)
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }
}
