import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'officespace-jwt-secret-2026'),
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Token inválido o usuario no encontrado.');
    return { id: user.id, email: user.email, role: user.role };
  }
}
