import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Issue } from './issue.entity';
import { User } from '../users/user.entity';
import { IssueStatus } from '../common/enums';

@Entity('issue_status_history')
export class IssueStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue: Issue;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: IssueStatus,
    nullable: true,
  })
  previousStatus: IssueStatus;

  @Column({ name: 'new_status', type: 'enum', enum: IssueStatus })
  newStatus: IssueStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy: User;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
