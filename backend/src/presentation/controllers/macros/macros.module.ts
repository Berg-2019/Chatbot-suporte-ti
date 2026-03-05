/**
 * Macros Module
 */

import { Module } from '@nestjs/common';
import { MacrosController } from './macros.controller';
import { MacrosService } from './macros.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MacrosController],
    providers: [MacrosService],
    exports: [MacrosService],
})
export class MacrosModule {}
