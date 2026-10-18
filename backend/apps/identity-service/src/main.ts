import { bootstrapService } from '@zelqune/common';
import { AppModule } from './app.module';
import { seedOwner } from './seed/owner.seed';

void bootstrapService(AppModule, 'identity-service', { commands: { seed: seedOwner } });
