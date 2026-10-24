import { createZodDto } from '@zelqune/common';
import {
  contentAssetSchema,
  contentAssetTicketSchema,
  homeContentResponseSchema,
  requestContentAssetUploadInputSchema,
  updateHomeContentInputSchema,
  updateHomeContentResultSchema,
} from '@zelqune/contracts';

export class HomeContentResponseDto extends createZodDto(homeContentResponseSchema) {}
export class UpdateHomeContentDto extends createZodDto(updateHomeContentInputSchema) {}
export class UpdateHomeContentResultDto extends createZodDto(updateHomeContentResultSchema) {}
export class RequestContentAssetDto extends createZodDto(requestContentAssetUploadInputSchema) {}
export class ContentAssetTicketDto extends createZodDto(contentAssetTicketSchema) {}
export class ContentAssetDto extends createZodDto(contentAssetSchema) {}
