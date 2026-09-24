import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChangeEmailUseCase } from '@Application/affiliates/change-email.use-case';
import { ChangePixKeyUseCase } from '@Application/affiliates/change-pix-key.use-case';
import { GetAffiliateAccountUseCase } from '@Application/affiliates/get-affiliate-account.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import { AffiliateAccountResponseDto } from './dtos/affiliate-account.response.dto';
import { ChangeEmailRequestDto } from './dtos/change-email.request.dto';
import { ChangePixKeyRequestDto } from './dtos/change-pix-key.request.dto';

@ApiTags('affiliate/me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AffiliateGuard)
@Controller('affiliate/me')
export class AffiliateMeController {
  constructor(
    private readonly getAffiliateAccountUseCase: GetAffiliateAccountUseCase,
    private readonly changePixKeyUseCase: ChangePixKeyUseCase,
    private readonly changeEmailUseCase: ChangeEmailUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: AffiliateAccountResponseDto })
  async account(@Actor() actor: ActorInfo): Promise<AffiliateAccountResponseDto> {
    // Nunca um id da rota: a conta que sai é sempre a de quem assinou o token.
    return AffiliateAccountResponseDto.from(
      await this.getAffiliateAccountUseCase.execute(actor.publicId),
    );
  }

  /**
   * Troca a chave PIX. A senha atual confirma a troca, e o dono recebe um aviso
   * por e-mail.
   */
  @Patch('pix-key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Chave trocada' })
  @ApiBadRequestResponse({
    description: 'Chave inválida para o tipo, CPF diferente do cadastro, ou senha incorreta',
  })
  async changePixKey(
    @Body() body: ChangePixKeyRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.changePixKeyUseCase.execute({ ...body, userPublicId: actor.publicId });
  }

  /**
   * Troca o e-mail, que também é o login. A senha atual confirma a troca, e o
   * endereço antigo recebe um aviso. A sessão aberta continua valendo.
   */
  @Patch('email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'E-mail trocado' })
  @ApiBadRequestResponse({ description: 'E-mail inválido ou senha incorreta' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado em outra conta' })
  async changeEmail(@Body() body: ChangeEmailRequestDto, @Actor() actor: ActorInfo): Promise<void> {
    await this.changeEmailUseCase.execute({ ...body, userPublicId: actor.publicId });
  }
}
