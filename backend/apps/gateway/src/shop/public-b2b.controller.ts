import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, Public, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  beaconEventSchema,
  publicQuoteSchema,
  quoteTrackQuerySchema,
  rfqRequestSchema,
  rfqResponseSchema,
  type PublicQuote,
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

/** Public B2B request-for-quote (section 5ক) and the storefront analytics beacon. */
@ApiTags('shop')
@Public()
@Controller()
export class PublicB2bController {
  constructor(private readonly services: ServiceRegistry) {}

  @Post('quote-requests')
  @RouteThrottle('rfq')
  @RequireTurnstile()
  @ApiOperation({ summary: 'Bulk / corporate order request (RFQ). We reply with a priced quote.' })
  @ZodResponse({ status: 201, type: RfqResponseDto })
  request(@Body() body: RfqRequestDto) {
    return this.services.get('order').send<RfqResponse>(RPC_PATTERNS.order.quotes.request, body);
  }

  @Get('quote-requests/track')
  @RouteThrottle('track')
  @ApiOperation({ summary: 'Status of a quote by code and phone.' })
  @ZodResponse({ type: PublicQuoteDto })
  track(@Query() query: QuoteTrackQueryDto) {
    return this.services.get('order').send<PublicQuote>(RPC_PATTERNS.order.quotes.track, query);
  }

  @Post('events')
  @HttpCode(204)
  @RouteThrottle('beacon')
  @ApiOperation({ summary: 'Analytics beacon: VIEW / ADD_TO_CART with an anonymous session id.' })
  async beacon(@Body() body: BeaconEventDto): Promise<void> {
    await this.services.get('analytics').send(RPC_PATTERNS.analytics.track, body);
  }
}
