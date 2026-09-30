import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.departmentRepo.find();
  }

  findOne(id: number): Promise<Department | null> {
    return this.departmentRepo.findOne({ where: { id } });
  }

  create(input: Partial<Department>): Promise<Department> {
    const department = this.departmentRepo.create(input);
    return this.departmentRepo.save(department);
  }
}
