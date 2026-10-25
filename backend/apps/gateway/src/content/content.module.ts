import { Module } from '@nestjs/common';
import { AdminContentController } from './admin-content.controller';
import { ContentController } from './content.controller';

@Module({ controllers: [ContentController, AdminContentController] })
export class ContentModule {}
