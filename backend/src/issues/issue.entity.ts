import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Department } from '../departments/department.entity';
import { IssueStatus, IssuePriority } from '../common/enums';

// GeoJSON-style Point, matches PostGIS GEOMETRY(Point, 4326)
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id', unique: true, length: 50 })
  ticketId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  category: string;

  @Column({
    type: 'enum',
    enum: IssueStatus,
    default: IssueStatus.SUBMITTED,
  })
  status: IssueStatus;

  @Column({
    type: 'enum',
    enum: IssuePriority,
    default: IssuePriority.MEDIUM,
  })
  priority: IssuePriority;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_officer_id' })
  assignedOfficer: User;

  // Geospatial Data (SRID 4326: Standard WGS 84 GPS Coordinates)
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: GeoPoint;

  @Column({ name: 'address_text', type: 'text', nullable: true })
  addressText: string;

  @Column({ name: 'sla_due_at', type: 'timestamp', nullable: true })
  slaDueAt: Date;

  @Column({ name: 'is_sla_breached', default: false })
  isSlaBreached: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
