/**
 * Live View Module
 */

import { Module } from '@nestjs/common';
import { LiveViewController } from './live-view.controller';
import { LiveViewService } from './live-view.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [LiveViewController],
    providers: [LiveViewService],
    exports: [LiveViewService],
})
export class LiveViewModule {}
