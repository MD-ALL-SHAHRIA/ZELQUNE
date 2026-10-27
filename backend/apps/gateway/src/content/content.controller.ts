import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, ServiceRegistry, ZodResponse } from '@zelqune/common';
import { type HomeContentResponse, RPC_PATTERNS } from '@zelqune/contracts';
import { HomeContentResponseDto } from './content.dto';
import { PublicCacheInterceptor } from '../cache/public-cache.interceptor';

/** Public storefront content (ADR 0015). `home` is null until the owner first saves it. */
@ApiTags('content')
@Public()
@UseInterceptors(PublicCacheInterceptor)
@Controller('content')
export class ContentController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('home')
  @ApiOperation({ summary: 'Home page content with image URLs (null before the first save).' })
  @ZodResponse({ type: HomeContentResponseDto })
  home(): Promise<HomeContentResponse> {
    return this.services.get('catalog').send(RPC_PATTERNS.catalog.contentHome, {});
  }
}
