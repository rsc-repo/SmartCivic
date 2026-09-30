import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue, GeoPoint } from './issue.entity';
import { IssueMedia } from './issue-media.entity';
import { IssueStatusHistory } from './issue-status-history.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { IssueStatus, UserRole } from '../common/enums';
import { generateTicketId } from '../common/utils/ticket-id';
import {
  EVIDENCE_MEDIA_SUBDIR,
  relativeMediaPath,
} from './media-storage.config';
import { isTransitionAllowed } from './issue-status.transitions';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../auth/jwt-payload.interface';

export interface FindIssuesFilter {
  departmentId?: number;
  assignedOfficerId?: number;
  status?: IssueStatus;
}

const MAX_TICKET_ID_ATTEMPTS = 5;

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    @InjectRepository(IssueMedia)
    private readonly issueMediaRepo: Repository<IssueMedia>,
    @InjectRepository(IssueStatusHistory)
    private readonly issueHistoryRepo: Repository<IssueStatusHistory>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateIssueDto,
    files: Express.Multer.File[],
    reporterId: number,
  ): Promise<Issue> {
    const location: GeoPoint = {
      type: 'Point',
      // GeoJSON order is [longitude, latitude]
      coordinates: [dto.longitude, dto.latitude],
    };

    const ticketId = await this.generateUniqueTicketId();

    const issue = this.issueRepo.create({
      ticketId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      status: IssueStatus.SUBMITTED,
      location,
      addressText: dto.addressText,
      reporter: { id: reporterId } as any,
      department: dto.departmentId ? ({ id: dto.departmentId } as any) : null,
    });

    const savedIssue = await this.issueRepo.save(issue);

    if (files?.length) {
      const mediaRecords = files.map((file) =>
        this.issueMediaRepo.create({
          issue: savedIssue,
          filePath: relativeMediaPath(file.filename),
          mediaType: file.mimetype,
        }),
      );
      await this.issueMediaRepo.save(mediaRecords);
    }

    await this.issueHistoryRepo.save(
      this.issueHistoryRepo.create({
        issue: savedIssue,
        previousStatus: undefined,
        newStatus: IssueStatus.SUBMITTED,
        changedBy: { id: reporterId } as any,
        comments: 'Issue submitted by citizen.',
      }),
    );

    return this.findOne(savedIssue.id);
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<Array<Issue & { distanceMeters: number }>> {
    // Cast to ::geography so ST_DWithin/ST_Distance operate in meters via
    // great-circle distance, rather than raw degrees (the default for a
    // plain ::geometry comparison, which would be wrong at any latitude
    // other than the equator).
    const { entities, raw } = await this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.reporter', 'reporter')
      .leftJoinAndSelect('issue.department', 'department')
      .leftJoinAndSelect('issue.assignedOfficer', 'assignedOfficer')
      .addSelect(
        'ST_Distance(issue.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)',
        'distance_meters',
      )
      .where(
        'ST_DWithin(issue.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)',
      )
      .setParameters({ lng, lat, radius: radiusMeters })
      .orderBy('distance_meters', 'ASC')
      .getRawAndEntities();

    return entities.map((issue, index) => ({
      ...issue,
      distanceMeters: Math.round(parseFloat(raw[index].distance_meters)),
    }));
  }

  async findAll(filter: FindIssuesFilter = {}): Promise<Issue[]> {
    const where: Record<string, unknown> = {};
    if (filter.departmentId) {
      where.department = { id: filter.departmentId };
    }
    if (filter.assignedOfficerId) {
      where.assignedOfficer = { id: filter.assignedOfficerId };
    }
    if (filter.status) {
      where.status = filter.status;
    }

    return this.issueRepo.find({
      where,
      relations: { reporter: true, department: true, assignedOfficer: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Issue> {
    const issue = await this.issueRepo.findOne({
      where: { id },
      relations: { reporter: true, department: true, assignedOfficer: true },
    });
    if (!issue) {
      throw new NotFoundException(`Issue #${id} not found`);
    }
    return issue;
  }

  async findMedia(issueId: number): Promise<IssueMedia[]> {
    await this.findOne(issueId); // 404s if the issue doesn't exist
    return this.issueMediaRepo.find({
      where: { issue: { id: issueId } },
      order: { uploadedAt: 'ASC' },
    });
  }

  async findHistory(issueId: number): Promise<IssueStatusHistory[]> {
    await this.findOne(issueId);
    return this.issueHistoryRepo.find({
      where: { issue: { id: issueId } },
      relations: { changedBy: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Assigns an officer to an issue and transitions it into ASSIGNED.
   * Restricted (at the controller level) to DEPT_ADMIN / SYSTEM_ADMIN —
   * officers don't self-assign in this phase.
   */
  async assignOfficer(
    issueId: number,
    officerId: number,
    actor: JwtPayload,
  ): Promise<Issue> {
    const issue = await this.findOne(issueId);

    if (!isTransitionAllowed(issue.status, IssueStatus.ASSIGNED)) {
      throw new BadRequestException(
        `Cannot assign an officer while issue is in status ${issue.status}.`,
      );
    }

    const officer = await this.usersService.findById(officerId);
    if (!officer || officer.role !== UserRole.OFFICER) {
      throw new BadRequestException(
        `User #${officerId} is not a valid OFFICER account.`,
      );
    }

    const previousStatus = issue.status;
    issue.assignedOfficer = officer;
    issue.status = IssueStatus.ASSIGNED;
    await this.issueRepo.save(issue);

    await this.issueHistoryRepo.save(
      this.issueHistoryRepo.create({
        issue,
        previousStatus,
        newStatus: IssueStatus.ASSIGNED,
        changedBy: { id: actor.sub } as any,
        comments: `Assigned to officer #${officerId} (${officer.fullName}).`,
      }),
    );

    return this.findOne(issueId);
  }

  /**
   * Officer-facing status transition. The assigned officer (or a
   * DEPT_ADMIN/SYSTEM_ADMIN) can move an issue forward through the
   * workflow. Marking RESOLVED automatically cascades to
   * VERIFICATION_PENDING in the same call (see issue-status.transitions.ts)
   * and, if evidence photos were attached, saves them to issue_media.
   */
  async updateStatus(
    issueId: number,
    dto: UpdateIssueStatusDto,
    evidenceFiles: Express.Multer.File[] | undefined,
    actor: JwtPayload,
  ): Promise<Issue> {
    const issue = await this.findOne(issueId);

    const isPrivileged =
      actor.role === UserRole.DEPT_ADMIN || actor.role === UserRole.SYSTEM_ADMIN;
    const isAssignedOfficer =
      actor.role === UserRole.OFFICER && issue.assignedOfficer?.id === actor.sub;

    if (!isPrivileged && !isAssignedOfficer) {
      throw new ForbiddenException(
        'Only the assigned officer or a department/system admin can update this issue.',
      );
    }

    if (!isTransitionAllowed(issue.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition issue from ${issue.status} to ${dto.status}.`,
      );
    }

    const previousStatus = issue.status;
    issue.status = dto.status;
    await this.issueRepo.save(issue);

    await this.issueHistoryRepo.save(
      this.issueHistoryRepo.create({
        issue,
        previousStatus,
        newStatus: dto.status,
        changedBy: { id: actor.sub } as any,
        comments: dto.comments ?? undefined,
      }),
    );

    if (evidenceFiles?.length) {
      const mediaRecords = evidenceFiles.map((file) =>
        this.issueMediaRepo.create({
          issue,
          filePath: relativeMediaPath(file.filename, EVIDENCE_MEDIA_SUBDIR),
          mediaType: file.mimetype,
        }),
      );
      await this.issueMediaRepo.save(mediaRecords);
    }

    // "When issue status is changed to RESOLVED, require citizen
    // verification" — cascade straight into VERIFICATION_PENDING so the
    // citizen verification endpoints (Phase 7) have a status to act on.
    if (dto.status === IssueStatus.RESOLVED) {
      issue.status = IssueStatus.VERIFICATION_PENDING;
      await this.issueRepo.save(issue);
      await this.issueHistoryRepo.save(
        this.issueHistoryRepo.create({
          issue,
          previousStatus: IssueStatus.RESOLVED,
          newStatus: IssueStatus.VERIFICATION_PENDING,
          changedBy: { id: actor.sub } as any,
          comments: 'Awaiting citizen confirmation.',
        }),
      );
    }

    return this.findOne(issueId);
  }

  private async generateUniqueTicketId(): Promise<string> {
    for (let attempt = 0; attempt < MAX_TICKET_ID_ATTEMPTS; attempt++) {
      const candidate = generateTicketId();
      const existing = await this.issueRepo.findOne({
        where: { ticketId: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }
    throw new Error('Could not generate a unique ticket id, please retry.');
  }
}
