/**
 * SmartCivic seed script (Phase 1, step 3)
 *
 * Seeds:
 *  - Default departments: Roads & Infrastructure, Sanitation, Water Supply, Public Lighting
 *  - Test users: one CITIZEN, one OFFICER, one SYSTEM_ADMIN
 *
 * Run with:
 *   npm run seed
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../src/config/data-source';
import { Department } from '../src/departments/department.entity';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/common/enums';

const DEFAULT_DEPARTMENTS: Array<Partial<Department>> = [
  { name: 'Roads & Infrastructure', code: 'ROADS', slaHoursDefault: 48 },
  { name: 'Sanitation', code: 'SANITATION', slaHoursDefault: 24 },
  { name: 'Water Supply', code: 'WATER', slaHoursDefault: 24 },
  { name: 'Public Lighting', code: 'LIGHTING', slaHoursDefault: 48 },
];

const TEST_USERS: Array<{
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}> = [
  {
    email: 'citizen@smartcivic.test',
    password: 'Password123!',
    fullName: 'Test Citizen',
    role: UserRole.CITIZEN,
  },
  {
    email: 'officer@smartcivic.test',
    password: 'Password123!',
    fullName: 'Test Officer',
    role: UserRole.OFFICER,
  },
  {
    email: 'admin@smartcivic.test',
    password: 'Password123!',
    fullName: 'Test Admin',
    role: UserRole.SYSTEM_ADMIN,
  },
];

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database for seeding.');

  const departmentRepo = dataSource.getRepository(Department);
  const userRepo = dataSource.getRepository(User);

  for (const dept of DEFAULT_DEPARTMENTS) {
    const existing = await departmentRepo.findOne({
      where: { code: dept.code },
    });
    if (!existing) {
      await departmentRepo.save(departmentRepo.create(dept));
      console.log(`  + department created: ${dept.name} (${dept.code})`);
    } else {
      console.log(`  = department already exists: ${dept.code}`);
    }
  }

  for (const testUser of TEST_USERS) {
    const existing = await userRepo.findOne({
      where: { email: testUser.email },
    });
    if (!existing) {
      const passwordHash = await bcrypt.hash(testUser.password, 10);
      await userRepo.save(
        userRepo.create({
          email: testUser.email,
          passwordHash,
          fullName: testUser.fullName,
          role: testUser.role,
        }),
      );
      console.log(`  + user created: ${testUser.email} (${testUser.role})`);
    } else {
      console.log(`  = user already exists: ${testUser.email}`);
    }
  }

  await dataSource.destroy();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
