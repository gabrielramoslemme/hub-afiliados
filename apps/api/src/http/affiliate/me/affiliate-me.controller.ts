import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { WithdrawalStatusEnum } from '@porto/contracts';
import { ChangeEmailUseCase } from '@Application/affiliates/change-email.use-case';
import { ChangeOccupationUseCase } from '@Application/affiliates/change-occupation.use-case';
import { ChangePixKeyUseCase } from '@Application/affiliates/change-pix-key.use-case';
import { GetAffiliateAccountUseCase } from '@Application/affiliates/get-affiliate-account.use-case';
import { GetAffiliateReferralsUseCase } from '@Application/sales/get-affiliate-referrals.use-case';
import { GetAffiliateWalletUseCase } from '@Application/sales/get-affiliate-wallet.use-case';
import { RequestWithdrawalUseCase } from '@Application/withdrawals/request-withdrawal.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import { AffiliateAccountResponseDto } from './dtos/affiliate-account.response.dto';
import { AffiliateReferralsResponseDto } from './dtos/affiliate-referrals.response.dto';
import { AffiliateWalletResponseDto } from './dtos/affiliate-wallet.response.dto';
import { AffiliateWithdrawalResponseDto } from './dtos/affiliate-withdrawal.response.dto';
import { ChangeEmailRequestDto } from './dtos/change-email.request.dto';
import { ChangeOccupationRequestDto } from './dtos/change-occupation.request.dto';
import { ChangePixKeyRequestDto } from './dtos/change-pix-key.request.dto';
import { ReferralsQueryDto } from './dtos/referrals.query.dto';
import { RequestWithdrawalRequestDto } from './dtos/request-withdrawal.request.dto';

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
    private readonly changeOccupationUseCase: ChangeOccupationUseCase,
    private readonly getAffiliateWalletUseCase: GetAffiliateWalletUseCase,
    private readonly getAffiliateReferralsUseCase: GetAffiliateReferralsUseCase,
    private readonly requestWithdrawalUseCase: RequestWithdrawalUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: AffiliateAccountResponseDto })
  async account(@Actor() actor: ActorInfo): Promise<AffiliateAccountResponseDto> {
    // Nunca um id da rota: a conta que sai é sempre a de quem assinou o token.
    return AffiliateAccountResponseDto.from(
      await this.getAffiliateAccountUseCase.execute(actor.publicId),
    );
  }

  /** O saldo para sacar, o que já foi sacado e o extrato. */
  @Get('wallet')
  @ApiOkResponse({ type: AffiliateWalletResponseDto })
  async wallet(@Actor() actor: ActorInfo): Promise<AffiliateWalletResponseDto> {
    return AffiliateWalletResponseDto.from(
      await this.getAffiliateWalletUseCase.execute(actor.publicId),
    );
  }

  /** As vendas feitas com o cupom. O período recorta a lista; o resumo é o acumulado. */
  @Get('referrals')
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

  /** Troca a ocupação. Sem senha: ela não desvia pagamento nem toma a conta. */
  @Patch('occupation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Ocupação trocada' })
  @ApiBadRequestResponse({ description: 'Ocupação fora da lista' })
  async changeOccupation(
    @Body() body: ChangeOccupationRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.changeOccupationUseCase.execute({ ...body, userPublicId: actor.publicId });
  }

  /**
   * Saca o saldo inteiro via PIX, na chave cadastrada. 201 quando o fornecedor
   * aceitou; 202 quando ele não respondeu — o pedido está gravado, já saiu do
   * saldo, e o PIX sai na reconciliação.
   */
  @Post('withdrawals')
  @ApiCreatedResponse({ type: AffiliateWithdrawalResponseDto, description: 'PIX aceito' })
  @ApiAcceptedResponse({
    type: AffiliateWithdrawalResponseDto,
    description: 'PIX em processamento',
  })
  @ApiConflictResponse({
    description:
      'Sem saldo (WDR-001), PIX recusado (WDR-002) ou saldo diferente do confirmado (WDR-004)',
  })
  @ApiServiceUnavailableResponse({ description: 'Saque desligado neste ambiente (WDR-003)' })
  async requestWithdrawal(
    @Actor() actor: ActorInfo,
    @Body() body: RequestWithdrawalRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AffiliateWithdrawalResponseDto> {
    const output = await this.requestWithdrawalUseCase.execute({
      userPublicId: actor.publicId,
      expectedCents: body.expectedCents ?? null,
    });

    response.status(
      output.status === WithdrawalStatusEnum.REQUESTED ? HttpStatus.ACCEPTED : HttpStatus.CREATED,
    );

    return AffiliateWithdrawalResponseDto.from(output);
  }
}
