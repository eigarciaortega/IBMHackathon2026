import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { User } from './users/entities/user.entity';
import { Space } from './spaces/entities/space.entity';
import { Booking } from './bookings/entities/booking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'officespace'),
        password: configService.get<string>('DB_PASSWORD', 'officespace123'),
        database: configService.get<string>('DB_DATABASE', 'officespace_db'),
        entities: [User, Space, Booking],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    BookingsModule,
  ],
})
export class AppModule {}
