/**
 * External Services Module
 */

import { Global, Module } from '@nestjs/common';
import { GlpiService } from './glpi.service';

@Global()
@Module({
  providers: [GlpiService],
  exports: [GlpiService],
})
export class ExternalModule {}
