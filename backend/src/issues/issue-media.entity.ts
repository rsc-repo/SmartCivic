import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Issue } from './issue.entity';

@Entity('issue_media')
export class IssueMedia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue: Issue;

  // Local filesystem path, relative to backend/uploads
  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @Column({ name: 'media_type', length: 50 })
  mediaType: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
