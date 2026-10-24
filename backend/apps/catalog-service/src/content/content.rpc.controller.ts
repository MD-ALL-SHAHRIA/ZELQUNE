import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type ContentAsset,
  type ContentAssetTicket,
  type HomeContentResponse,
  type RequestContentAssetUploadInput,
  RPC_PATTERNS,
  type RpcRequest,
  type UpdateHomeContentInput,
} from '@zelqune/contracts';
import { ContentService } from './content.service';

const A = RPC_PATTERNS.catalog.admin;

/** Storefront content: public read for the gateway, writes behind OWNER/STAFF routes. */
@Controller()
export class ContentRpcController {
  constructor(private readonly content: ContentService) {}

  @MessagePattern(RPC_PATTERNS.catalog.contentHome)
  home(): Promise<HomeContentResponse> {
    return this.content.home();
  }

  @MessagePattern(A.getHomeContent)
  adminHome(): Promise<HomeContentResponse> {
    return this.content.home();
  }

  @MessagePattern(A.updateHomeContent)
  updateHome(
    @Payload() req: RpcRequest<UpdateHomeContentInput>,
  ): Promise<{ version: number; updatedAt: string }> {
    return this.content.updateHome(req.data);
  }

  @MessagePattern(A.requestContentAsset)
  requestAsset(
    @Payload() req: RpcRequest<RequestContentAssetUploadInput>,
  ): Promise<ContentAssetTicket> {
    return this.content.requestAssetUpload(req.data);
  }

  @MessagePattern(A.confirmContentAsset)
  confirmAsset(@Payload() req: RpcRequest<{ assetId: string }>): Promise<ContentAsset> {
    return this.content.confirmAssetUpload(req.data);
  }
}
