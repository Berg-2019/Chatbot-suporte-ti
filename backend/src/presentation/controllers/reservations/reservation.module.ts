/**
 * Reservation Module - Gestão de Agendamento de Patrimônio
 */

import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ReservationController],
    providers: [ReservationService],
    exports: [ReservationService],
})
export class ReservationModule { }
