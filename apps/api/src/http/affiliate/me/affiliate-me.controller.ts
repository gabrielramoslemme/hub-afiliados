import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChangeEmailUseCase } from '@Application/affiliates/change-email.use-case';
import { ChangeOccupationUseCase } from '@Application/affiliates/change-occupation.use-case';
import { ChangePixKeyUseCase } from '@Application/affiliates/change-pix-key.use-case';
import { GetAffiliateAccountUseCase } from '@Application/affiliates/get-affiliate-account.use-case';
import { CompleteTrainingModuleUseCase } from '@Application/materials/complete-training-module.use-case';
import { GetAffiliateMaterialsUseCase } from '@Application/materials/get-affiliate-materials.use-case';
import { UncompleteTrainingModuleUseCase } from '@Application/materials/uncomplete-training-module.use-case';
import { GetAffiliateReferralsUseCase } from '@Application/sales/get-affiliate-referrals.use-case';
import { GetAffiliateWalletUseCase } from '@Application/sales/get-affiliate-wallet.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import { AffiliateAccountResponseDto } from './dtos/affiliate-account.response.dto';
import { AffiliateMaterialsResponseDto } from './dtos/affiliate-materials.response.dto';
import { AffiliateReferralsResponseDto } from './dtos/affiliate-referrals.response.dto';
import { AffiliateWalletResponseDto } from './dtos/affiliate-wallet.response.dto';
import { ChangeEmailRequestDto } from './dtos/change-email.request.dto';
import { ChangeOccupationRequestDto } from './dtos/change-occupation.request.dto';
import { ChangePixKeyRequestDto } from './dtos/change-pix-key.request.dto';
import { ReferralsQueryDto } from './dtos/referrals.query.dto';

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
    private readonly getAffiliateMaterialsUseCase: GetAffiliateMaterialsUseCase,
    private readonly completeTrainingModuleUseCase: CompleteTrainingModuleUseCase,
    private readonly uncompleteTrainingModuleUseCase: UncompleteTrainingModuleUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: AffiliateAccountResponseDto })
  async account(@Actor() actor: ActorInfo): Promise<AffiliateAccountResponseDto> {
    // Nunca um id da rota: a conta que sai é sempre a de quem assinou o token.
    return AffiliateAccountResponseDto.from(
      await this.getAffiliateAccountUseCase.execute(actor.publicId),
    );
  }

  /** Os incentivos liberados do afiliado. Sem saldo: os pagamentos ainda não chegam aqui. */
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

  /** A aba Materiais: a trilha de formação com o progresso de quem pediu, e os arquivos. */
  @Get('materials')
  @ApiOkResponse({ type: AffiliateMaterialsResponseDto })
  async materials(@Actor() actor: ActorInfo): Promise<AffiliateMaterialsResponseDto> {
    return AffiliateMaterialsResponseDto.from(
      await this.getAffiliateMaterialsUseCase.execute(actor.publicId),
    );
  }

  /**
   * Marca o módulo como assistido por quem assinou o token. PUT porque repetir
   * não muda nada: a conclusão é um estado, e a data que fica é a da primeira vez.
   */
  @Put('training-modules/:publicId/completion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Módulo marcado como assistido' })
  @ApiNotFoundResponse({ description: 'Módulo não encontrado' })
  async completeTrainingModule(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.completeTrainingModuleUseCase.execute({
      userPublicId: actor.publicId,
      trainingModulePublicId: publicId,
    });
  }

  /** Desfaz a marca de assistido. Repetir não é erro, como no PUT. */
  @Delete('training-modules/:publicId/completion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Marca de assistido removida' })
  @ApiNotFoundResponse({ description: 'Módulo não encontrado' })
  async uncompleteTrainingModule(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.uncompleteTrainingModuleUseCase.execute({
      userPublicId: actor.publicId,
      trainingModulePublicId: publicId,
    });
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
}
