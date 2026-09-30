import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './issue.entity';
import { IssueMedia } from './issue-media.entity';
import { IssueStatusHistory } from './issue-status-history.entity';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue, IssueMedia, IssueStatusHistory]),
    UsersModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [TypeOrmModule, IssuesService],
})
export class IssuesModule {}
