import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async seedUsers(): Promise<void> {
    const predefined = [
      { email: 'admin@corporativoalpha.com', password: 'Admin123', role: UserRole.ADMINISTRADOR },
      { email: 'carlos.mendez@corporativoalpha.com', password: 'User123', role: UserRole.COLABORADOR },
      { email: 'ana.torres@corporativoalpha.com', password: 'User123', role: UserRole.COLABORADOR },
    ];

    for (const userData of predefined) {
      const exists = await this.findByEmail(userData.email);
      if (!exists) {
        const hashed = await bcrypt.hash(userData.password, 10);
        const user = this.usersRepository.create({
          email: userData.email,
          password: hashed,
          role: userData.role,
        });
        await this.usersRepository.save(user);
        console.log(`[Seed] Usuario creado: ${userData.email}`);
      }
    }
  }
}
