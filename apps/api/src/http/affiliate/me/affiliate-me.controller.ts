import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRoleEnum } from '@porto/contracts';
import { ChangeEmailUseCase } from '@Application/affiliates/change-email.use-case';
import { ChangeOccupationUseCase } from '@Application/affiliates/change-occupation.use-case';
import { ChangePixKeyUseCase } from '@Application/affiliates/change-pix-key.use-case';
import { GetAffiliateAccountUseCase } from '@Application/affiliates/get-affiliate-account.use-case';
import { RevealAffiliateDocumentsUseCase } from '@Application/affiliates/reveal-affiliate-documents.use-case';
import { GetAffiliateReferralsUseCase } from '@Application/sales/get-affiliate-referrals.use-case';
import { GetAffiliateWalletUseCase } from '@Application/sales/get-affiliate-wallet.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import { PasswordAttemptThrottle } from '@Http/shared/throttling/throttle-limits';
import { AffiliateAccountResponseDto } from './dtos/affiliate-account.response.dto';
import { AffiliateDocumentsResponseDto } from './dtos/affiliate-documents.response.dto';
import { AffiliateReferralsResponseDto } from './dtos/affiliate-referrals.response.dto';
import { AffiliateWalletResponseDto } from './dtos/affiliate-wallet.response.dto';
import { ChangeEmailRequestDto } from './dtos/change-email.request.dto';
import { ChangeOccupationRequestDto } from './dtos/change-occupation.request.dto';
import { ChangePixKeyRequestDto } from './dtos/change-pix-key.request.dto';
import { ReferralsQueryDto } from './dtos/referrals.query.dto';
import { RevealDocumentsRequestDto } from './dtos/reveal-documents.request.dto';

@ApiTags('affiliate/me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AffiliateGuard)
@Controller('affiliate/me')
export class AffiliateMeController {
  constructor(
    private readonly getAffiliateAccountUseCase: GetAffiliateAccountUseCase,
    private readonly revealAffiliateDocumentsUseCase: RevealAffiliateDocumentsUseCase,
    private readonly changePixKeyUseCase: ChangePixKeyUseCase,
    private readonly changeEmailUseCase: ChangeEmailUseCase,
    private readonly changeOccupationUseCase: ChangeOccupationUseCase,
    private readonly getAffiliateWalletUseCase: GetAffiliateWalletUseCase,
    private readonly getAffiliateReferralsUseCase: GetAffiliateReferralsUseCase,
  ) {}

  @Get()
  @Roles(UserRoleEnum.AFFILIATE)
  @ApiOkResponse({ type: AffiliateAccountResponseDto })
  async account(@Actor() actor: ActorInfo): Promise<AffiliateAccountResponseDto> {
    // Nunca um id da rota: a conta que sai é sempre a de quem assinou o token.
    return AffiliateAccountResponseDto.from(
      await this.getAffiliateAccountUseCase.execute(actor.publicId),
    );
  }

  /**
   * CPF, RG e chave PIX inteiros. POST porque a senha vai no corpo, e `no-store`
   * para o documento não ficar no cache do navegador nem de proxy no caminho.
   */
  @Post('documents')
  @Roles(UserRoleEnum.AFFILIATE)
  @PasswordAttemptThrottle()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AffiliateDocumentsResponseDto })
  @ApiBadRequestResponse({ description: 'Senha incorreta' })
  @ApiTooManyRequestsResponse({ description: 'Tentativas demais; o Retry-After diz quando voltar' })
  async documents(
    @Body() body: RevealDocumentsRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<AffiliateDocumentsResponseDto> {
    return AffiliateDocumentsResponseDto.from(
      await this.revealAffiliateDocumentsUseCase.execute({ ...body, userPublicId: actor.publicId }),
    );
  }

  /** Os incentivos liberados do afiliado. Sem saldo: os pagamentos ainda não chegam aqui. */
  @Get('wallet')
  @Roles(UserRoleEnum.AFFILIATE)
  @ApiOkResponse({ type: AffiliateWalletResponseDto })
  async wallet(@Actor() actor: ActorInfo): Promise<AffiliateWalletResponseDto> {
    return AffiliateWalletResponseDto.from(
      await this.getAffiliateWalletUseCase.execute(actor.publicId),
    );
  }

  /** As vendas feitas com o cupom. O período recorta a lista; o resumo é o acumulado. */
  @Get('referrals')
  @Roles(UserRoleEnum.AFFILIATE)
  @ApiOkResponse({ type: AffiliateReferralsResponseDto })
  @ApiBadRequestResponse({ description: 'Período inválido' })
  async referrals(
    @Query() query: ReferralsQueryDto,
    @Actor() actor: ActorInfo,
  ): Promise<AffiliateReferralsResponseDto> {
    return AffiliateReferralsResponseDto.from(
      await this.getAffiliateReferralsUseCase.execute({
        userPublicId: actor.publicId,
        period: query.period,
      }),
    );
  }

  /**
   * Troca a chave PIX. A senha atual confirma a troca, e o dono recebe um aviso
   * por e-mail.
   */
  @Patch('pix-key')
  @PasswordAttemptThrottle()
  @Roles(UserRoleEnum.AFFILIATE)
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
  @PasswordAttemptThrottle()
  @Roles(UserRoleEnum.AFFILIATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'E-mail trocado' })
  @ApiBadRequestResponse({ description: 'E-mail inválido ou senha incorreta' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado em outra conta' })
  async changeEmail(@Body() body: ChangeEmailRequestDto, @Actor() actor: ActorInfo): Promise<void> {
    await this.changeEmailUseCase.execute({ ...body, userPublicId: actor.publicId });
  }

  /** Troca a ocupação. Sem senha: ela não desvia pagamento nem toma a conta. */
  @Patch('occupation')
  @Roles(UserRoleEnum.AFFILIATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Ocupação trocada' })
  @ApiBadRequestResponse({ description: 'Ocupação fora da lista' })
  async changeOccupation(
    @Body() body: ChangeOccupationRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.changeOccupationUseCase.execute({ ...body, userPublicId: actor.publicId });
  }
}
