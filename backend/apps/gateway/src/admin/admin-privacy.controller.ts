import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  adminPrivacyListQuerySchema,
  askVerificationInputSchema,
  completePrivacyInputSchema,
  correctPrivacyInputSchema,
  type PrivacyExport,
  privacyExportSchema,
  type PrivacyList,
  privacyListSchema,
  type PrivacyRequestDetail,
  privacyRequestDetailSchema,
  rejectPrivacyInputSchema,
  RPC_PATTERNS,
  verifyPrivacyInputSchema,
} from '@zelqune/contracts';
import { Roles } from '../auth/guards';
import { IdParamDto } from './admin.dto';

class PrivacyListQueryDto extends createZodDto(adminPrivacyListQuerySchema) {}
class PrivacyListDto extends createZodDto(privacyListSchema) {}
class PrivacyRequestDetailDto extends createZodDto(privacyRequestDetailSchema) {}
class PrivacyExportDto extends createZodDto(privacyExportSchema) {}
class AskVerificationDto extends createZodDto(askVerificationInputSchema) {}
class VerifyPrivacyDto extends createZodDto(verifyPrivacyInputSchema) {}
class RejectPrivacyDto extends createZodDto(rejectPrivacyInputSchema) {}
class CorrectPrivacyDto extends createZodDto(correctPrivacyInputSchema) {}
class CompletePrivacyDto extends createZodDto(completePrivacyInputSchema) {}

const P = RPC_PATTERNS.order.privacy.admin;

/**
 * Privacy requests (ADR 0020). OWNER only: these screens show contact details and can export or
 * erase a customer's data, so staff accounts never reach them.
 */
@ApiTags('admin: privacy')
@ApiBearerAuth()
@Roles('OWNER')
@Controller('admin/privacy-requests')
export class AdminPrivacyController {
  constructor(private readonly services: ServiceRegistry) {}

  private send<T>(pattern: string, id: string, input?: unknown) {
    return this.services.get('order').send<T>(pattern, { id, input });
  }

  @Get()
  @ZodResponse({ type: PrivacyListDto })
  list(@Query() query: PrivacyListQueryDto) {
    return this.services.get('order').send<PrivacyList>(P.list, query);
  }

  @Get(':id')
  @ZodResponse({ type: PrivacyRequestDetailDto })
  get(@Param() { id }: IdParamDto) {
    return this.send<PrivacyRequestDetail>(P.get, id);
  }

  @Post(':id/ask-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ask the requester to confirm from the number on file.' })
  @ZodResponse({ type: PrivacyRequestDetailDto })
  askVerification(@Param() { id }: IdParamDto, @Body() body: AskVerificationDto) {
    return this.send<PrivacyRequestDetail>(P.askVerification, id, body);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @ZodResponse({ type: PrivacyRequestDetailDto })
  verify(@Param() { id }: IdParamDto, @Body() body: VerifyPrivacyDto) {
    return this.send<PrivacyRequestDetail>(P.verify, id, body);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ZodResponse({ type: PrivacyRequestDetailDto })
  reject(@Param() { id }: IdParamDto, @Body() body: RejectPrivacyDto) {
    return this.send<PrivacyRequestDetail>(P.reject, id, body);
  }

  @Post(':id/export')
  @HttpCode(200)
  @ApiOperation({ summary: 'Access request: everything held for this phone, as JSON.' })
  @ZodResponse({ type: PrivacyExportDto })
  export(@Param() { id }: IdParamDto) {
    return this.send<PrivacyExport>(P.export, id);
  }

  @Post(':id/correct')
  @HttpCode(200)
  @ZodResponse({ type: PrivacyRequestDetailDto })
  correct(@Param() { id }: IdParamDto, @Body() body: CorrectPrivacyDto) {
    return this.send<PrivacyRequestDetail>(P.correct, id, body);
  }

  @Post(':id/erase')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deletion request: erase what may go, keep sale records.' })
  @ZodResponse({ type: PrivacyRequestDetailDto })
  erase(@Param() { id }: IdParamDto) {
    return this.send<PrivacyRequestDetail>(P.erase, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ZodResponse({ type: PrivacyRequestDetailDto })
  complete(@Param() { id }: IdParamDto, @Body() body: CompletePrivacyDto) {
    return this.send<PrivacyRequestDetail>(P.complete, id, body);
  }
}
