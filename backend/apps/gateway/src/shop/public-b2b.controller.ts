import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, RequireAccount } from '../auth/guards';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, Public, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  beaconEventSchema,
  publicQuoteSchema,
  quoteTrackQuerySchema,
  rfqRequestSchema,
  rfqResponseSchema,
  type PublicPrivacyRequest,
  publicPrivacyRequestSchema,
  privacyTrackSchema,
  type PublicQuote,
  submitPrivacyRequestSchema,
  submitPrivacyResultSchema,
  type SubmitPrivacyResult,
  type RfqResponse,
  RPC_PATTERNS,
} from '@zelqune/contracts';
import { RouteThrottle } from '../throttling/throttling.module';
import { RequireTurnstile } from '../turnstile/turnstile';

class RfqRequestDto extends createZodDto(rfqRequestSchema) {}
class RfqResponseDto extends createZodDto(rfqResponseSchema) {}
class QuoteTrackQueryDto extends createZodDto(quoteTrackQuerySchema) {}
class PublicQuoteDto extends createZodDto(publicQuoteSchema) {}
class BeaconEventDto extends createZodDto(beaconEventSchema) {}
class SubmitPrivacyRequestDto extends createZodDto(submitPrivacyRequestSchema) {}
class SubmitPrivacyResultDto extends createZodDto(submitPrivacyResultSchema) {}
class PrivacyTrackDto extends createZodDto(privacyTrackSchema) {}
class PublicPrivacyRequestDto extends createZodDto(publicPrivacyRequestSchema) {}

/** Public B2B request-for-quote (section 5ক) and the storefront analytics beacon. */
@ApiTags('shop')
@Public()
@Controller()
export class PublicB2bController {
  constructor(private readonly services: ServiceRegistry) {}

  @Post('quote-requests')
  @RequireAccount()
  @RouteThrottle('rfq')
  @RequireTurnstile()
  @ApiOperation({ summary: 'Bulk / corporate order request (RFQ). We reply with a priced quote.' })
  @ZodResponse({ status: 201, type: RfqResponseDto })
  request(@Body() body: RfqRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.services.get('order').send<RfqResponse>(RPC_PATTERNS.order.quotes.request, {
      request: body,
      customerUserId: user.id,
    });
  }

  /** POST so the phone number travels in the body, never in a URL (URLs end up in logs). */
  @Post('quote-requests/track')
  @HttpCode(200)
  @RouteThrottle('track')
  @ApiOperation({ summary: 'Status of a quote by code and phone.' })
  @ZodResponse({ status: 200, type: PublicQuoteDto })
  track(@Body() query: QuoteTrackQueryDto) {
    return this.services.get('order').send<PublicQuote>(RPC_PATTERNS.order.quotes.track, query);
  }

  /**
   * Privacy request (ADR 0020). The answer is the same whether or not the phone has records, so
   * the form cannot be used to find out who is a customer.
   */
  @Post('privacy-requests')
  @RouteThrottle('rfq')
  @RequireTurnstile()
  @ApiOperation({ summary: 'Ask to see, correct or delete your data, or withdraw consent.' })
  @ZodResponse({ status: 201, type: SubmitPrivacyResultDto })
  privacyRequest(@Body() body: SubmitPrivacyRequestDto) {
    return this.services
      .get('order')
      .send<SubmitPrivacyResult>(RPC_PATTERNS.order.privacy.submit, body);
  }

  @Post('privacy-requests/track')
  @HttpCode(200)
  @RouteThrottle('track')
  @ApiOperation({ summary: 'Status of a privacy request by code and phone.' })
  @ZodResponse({ status: 200, type: PublicPrivacyRequestDto })
  privacyTrack(@Body() body: PrivacyTrackDto) {
    return this.services
      .get('order')
      .send<PublicPrivacyRequest>(RPC_PATTERNS.order.privacy.track, body);
  }

  @Post('events')
  @HttpCode(204)
  @RouteThrottle('beacon')
  @ApiOperation({ summary: 'Analytics beacon: VIEW / ADD_TO_CART with an anonymous session id.' })
  async beacon(@Body() body: BeaconEventDto): Promise<void> {
    await this.services.get('analytics').send(RPC_PATTERNS.analytics.track, body);
  }
}
