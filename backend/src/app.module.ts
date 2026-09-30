import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { dataSourceOptions } from './config/data-source';
import { AppController } from './app.controller';
import { DepartmentsModule } from './departments/departments.module';
import { UsersModule } from './users/users.module';
import { IssuesModule } from './issues/issues.module';
import { AuthModule } from './auth/auth.module';
// SlaModule is added in Phase 6 (cron-based SLA engine)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    ScheduleModule.forRoot(),
    // Serves backend/uploads/* as static files, e.g. GET /uploads/<file>
    // (no S3 / MinIO — plain local disk storage per project spec)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    DepartmentsModule,
    UsersModule,
    IssuesModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
