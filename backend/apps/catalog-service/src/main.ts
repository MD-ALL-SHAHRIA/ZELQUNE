import { bootstrapService } from '@zelqune/common';
import { AppModule } from './app.module';
import { seedCatalog } from './seed/catalog.seed';

void bootstrapService(AppModule, 'catalog-service', { commands: { seed: seedCatalog } });
