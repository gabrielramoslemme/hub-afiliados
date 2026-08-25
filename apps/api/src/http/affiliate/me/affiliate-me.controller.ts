import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetAffiliateAccountUseCase } from '@Application/affiliates/get-affiliate-account.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import { AffiliateAccountResponseDto } from './dtos/affiliate-account.response.dto';

@ApiTags('affiliate/me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AffiliateGuard)
@Controller('affiliate/me')
export class AffiliateMeController {
  constructor(private readonly getAffiliateAccountUseCase: GetAffiliateAccountUseCase) {}

  @Get()
  @ApiOkResponse({ type: AffiliateAccountResponseDto })
  async account(@Actor() actor: ActorInfo): Promise<AffiliateAccountResponseDto> {
    // Nunca um id da rota: a conta que sai é sempre a de quem assinou o token.
    return AffiliateAccountResponseDto.from(
      await this.getAffiliateAccountUseCase.execute(actor.publicId),
    );
  }
}
