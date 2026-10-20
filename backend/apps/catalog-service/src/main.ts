import { bootstrapService } from '@zelqune/common';
import { AppModule } from './app.module';
import { seedCatalog } from './seed/catalog.seed';
import { seedDemoCatalog } from './seed/demo.seed';

void bootstrapService(AppModule, 'catalog-service', {
  commands: { seed: seedCatalog, 'seed-demo': seedDemoCatalog },
});
