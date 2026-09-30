import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/user.entity';
import { Department } from '../departments/department.entity';
import { Issue } from '../issues/issue.entity';
import { IssueMedia } from '../issues/issue-media.entity';
import { IssueStatusHistory } from '../issues/issue-status-history.entity';

dotenv.config();

// Shared config: used both by NestJS (TypeOrmModule.forRoot) and by the
// standalone CLI scripts (schema init / seed) run via ts-node.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smartcivic_db',
  entities: [User, Department, Issue, IssueMedia, IssueStatusHistory],
  synchronize: false, // schema is managed explicitly via db/schema.sql
  logging: process.env.NODE_ENV === 'development',
};

export default new DataSource(dataSourceOptions);
