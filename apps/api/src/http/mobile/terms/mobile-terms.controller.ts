import { Controller, Get } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetCurrentTermsUseCase } from '@Application/terms/get-current-terms.use-case';
import { CurrentTermsResponseDto } from './dtos/current-terms.response.dto';

@ApiTags('mobile/terms')
@Controller('mobile/terms')
export class MobileTermsController {
  constructor(private readonly getCurrentTermsUseCase: GetCurrentTermsUseCase) {}

  @Get('current')
  @ApiOkResponse({ type: CurrentTermsResponseDto })
  @ApiNotFoundResponse({ description: 'TERMS_NOT_PUBLISHED' })
  async current(): Promise<CurrentTermsResponseDto> {
    const terms = await this.getCurrentTermsUseCase.execute();
    return {
      version: terms.version,
      contentUrl: terms.contentUrl,
      publishedAt: terms.publishedAt.toISOString(),
    };
  }
}
