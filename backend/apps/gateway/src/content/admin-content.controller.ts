import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type ContentAsset,
  type ContentAssetTicket,
  type HomeContentResponse,
  RPC_PATTERNS,
} from '@zelqune/contracts';
import { IdParamDto } from '../admin/admin.dto';
import { Roles } from '../auth/guards';
import {
  ContentAssetDto,
  ContentAssetTicketDto,
  HomeContentResponseDto,
  RequestContentAssetDto,
  UpdateHomeContentDto,
  UpdateHomeContentResultDto,
} from './content.dto';

const C = RPC_PATTERNS.catalog.admin;

/** Storefront content editing for OWNER/STAFF (ADR 0015). Every save is audited. */
@ApiTags('admin: content')
@ApiBearerAuth()
@Roles('OWNER', 'STAFF')
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly services: ServiceRegistry) {}

  private catalog<T>(pattern: string, data: unknown): Promise<T> {
    return this.services.get('catalog').send<T>(pattern, data);
  }

  @Get('home')
  @ZodResponse({ type: HomeContentResponseDto })
  home() {
    return this.catalog<HomeContentResponse>(C.getHomeContent, {});
  }

  @Put('home')
  @ApiOperation({
    summary:
      'Save the home content. Send the version you loaded (0 for the first save); 409 if it changed.',
  })
  @ZodResponse({ type: UpdateHomeContentResultDto })
  save(@Body() body: UpdateHomeContentDto) {
    return this.catalog<{ version: number; updatedAt: string }>(C.updateHomeContent, body);
  }

  @Post('assets/uploads')
  @ApiOperation({
    summary: 'Get a presigned upload URL for an image; PUT the file there, then confirm.',
  })
  @ZodResponse({ status: 201, type: ContentAssetTicketDto })
  requestUpload(@Body() body: RequestContentAssetDto) {
    return this.catalog<ContentAssetTicket>(C.requestContentAsset, body);
  }

  @Post('assets/:id/confirm')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: ContentAssetDto })
  confirm(@Param() { id }: IdParamDto) {
    return this.catalog<ContentAsset>(C.confirmContentAsset, { assetId: id });
  }
}
