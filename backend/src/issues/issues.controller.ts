import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { FindIssuesQueryDto } from './dto/find-issues-query.dto';
import { AssignOfficerDto } from './dto/assign-officer.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import {
  evidenceMediaMulterOptions,
  issueMediaMulterOptions,
} from './media-storage.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UserRole } from '../common/enums';

const MAX_MEDIA_FILES = 5;

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  // Any authenticated user (citizen, officer, admin) can report an issue.
  // multipart/form-data: scalar fields per CreateIssueDto + up to 5 files
  // under the "media" field name.
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FilesInterceptor('media', MAX_MEDIA_FILES, issueMediaMulterOptions()),
  )
  create(
    @Body() dto: CreateIssueDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.issuesService.create(dto, files, user.sub);
  }

  // Public reads — the map/dashboard views need these without requiring
  // login just to browse reported issues.
  //
  // IMPORTANT: "nearby" must be declared before the ":id" route below, or
  // Nest/Express would try to match "nearby" as the :id param instead.
  @Get('nearby')
  findNearby(@Query() query: NearbyQueryDto) {
    return this.issuesService.findNearby(
      query.lat,
      query.lng,
      query.radius ?? 2000,
    );
  }

  // Supports ?departmentId=&assignedOfficerId=&status= — used by the
  // officer dashboard to filter "issues assigned to my department" /
  // "issues assigned to me", and by the public map to filter by category.
  @Get()
  findAll(@Query() query: FindIssuesQueryDto) {
    return this.issuesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.findOne(id);
  }

  @Get(':id/media')
  findMedia(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.findMedia(id);
  }

  @Get(':id/history')
  findHistory(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.findHistory(id);
  }

  // Department/system admins assign an officer to a submitted/triaged
  // issue; this also transitions the issue to ASSIGNED.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEPT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignOfficerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.issuesService.assignOfficer(id, dto.officerId, user);
  }

  // The assigned officer (or a dept/system admin) moves the issue forward
  // through the workflow: ASSIGNED -> IN_PROGRESS -> RESOLVED (which
  // auto-cascades to VERIFICATION_PENDING). Accepts multipart so repair
  // evidence photos can be attached under the "evidence" field, e.g. when
  // marking RESOLVED.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id/status')
  @UseInterceptors(
    FilesInterceptor('evidence', MAX_MEDIA_FILES, evidenceMediaMulterOptions()),
  )
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueStatusDto,
    @UploadedFiles() evidenceFiles: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.issuesService.updateStatus(id, dto, evidenceFiles, user);
  }
}
