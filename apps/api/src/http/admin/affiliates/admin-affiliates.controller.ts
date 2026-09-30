import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRoleEnum } from '@porto/contracts';
import { ApproveAffiliateUseCase } from '@Application/affiliates/approve-affiliate.use-case';
import { GetAffiliateUseCase } from '@Application/affiliates/get-affiliate.use-case';
import { ListAffiliateAuditLogsUseCase } from '@Application/affiliates/list-affiliate-audit-logs.use-case';
import { ListAffiliatesUseCase } from '@Application/affiliates/list-affiliates.use-case';
import { ListAffiliatesReportUseCase } from '@Application/affiliates/list-affiliates-report.use-case';
import { RejectAffiliateUseCase } from '@Application/affiliates/reject-affiliate.use-case';
import { ChangeAffiliateCouponUseCase } from '@Application/coupons/change-affiliate-coupon.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { AffiliateAuditLogResponseDto } from './dtos/affiliate-audit-log.response.dto';
import {
  AffiliateDetailResponseDto,
  CouponSummaryResponseDto,
} from './dtos/affiliate-detail.response.dto';
import { PaginatedAffiliatesResponseDto } from './dtos/affiliate-list-item.response.dto';
import { AffiliateReportRowResponseDto } from './dtos/affiliate-report-row.response.dto';
import { ApproveAffiliateRequestDto } from './dtos/approve-affiliate.request.dto';
import { ChangeCouponRequestDto } from './dtos/change-coupon.request.dto';
import { ListAffiliatesQueryDto } from './dtos/list-affiliates.query.dto';
import { RejectAffiliateRequestDto } from './dtos/reject-affiliate.request.dto';

@ApiTags('admin/affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@ApiForbiddenResponse({ description: 'Token de outro canal, ou perfil fora dos que a rota aceita' })
@UseGuards(AdminGuard)
@Controller('admin/affiliates')
export class AdminAffiliatesController {
  constructor(
    private readonly listAffiliatesUseCase: ListAffiliatesUseCase,
    private readonly getAffiliateUseCase: GetAffiliateUseCase,
    private readonly listAffiliateAuditLogsUseCase: ListAffiliateAuditLogsUseCase,
    private readonly approveAffiliateUseCase: ApproveAffiliateUseCase,
    private readonly rejectAffiliateUseCase: RejectAffiliateUseCase,
    private readonly changeAffiliateCouponUseCase: ChangeAffiliateCouponUseCase,
    private readonly listAffiliatesReportUseCase: ListAffiliatesReportUseCase,
  ) {}

  @Get()
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: PaginatedAffiliatesResponseDto })
  async list(@Query() query: ListAffiliatesQueryDto): Promise<PaginatedAffiliatesResponseDto> {
    const result = await this.listAffiliatesUseCase.execute({
      page: query.page,
      limit: query.limit,
      status: query.status ?? null,
      occupation: query.occupation ?? null,
      search: query.search?.trim() || null,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return PaginatedAffiliatesResponseDto.from(result);
  }

  /**
   * A planilha do painel: todos os afiliados, com o cadastro completo, o cupom
   * e a soma das vendas concluídas. Declarada antes de `:publicId`, que casaria
   * `report` e o recusaria como uuid inválido.
   */
  @Get('report')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: [AffiliateReportRowResponseDto] })
  async report(): Promise<AffiliateReportRowResponseDto[]> {
    const rows = await this.listAffiliatesReportUseCase.execute();

    return rows.map(AffiliateReportRowResponseDto.from);
  }

  @Get(':publicId')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: AffiliateDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  async detail(
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ): Promise<AffiliateDetailResponseDto> {
    return AffiliateDetailResponseDto.from(await this.getAffiliateUseCase.execute(publicId));
  }

  /**
   * A trilha de auditoria: o cadastro, as mudanças de status, as edições do
   * perfil e o cupom, da mais recente para a mais antiga.
   */
  @Get(':publicId/audit-logs')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: [AffiliateAuditLogResponseDto] })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  async auditLogs(
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ): Promise<AffiliateAuditLogResponseDto[]> {
    const entries = await this.listAffiliateAuditLogsUseCase.execute(publicId);

    return entries.map(AffiliateAuditLogResponseDto.from);
  }

  /** Aprovar é criar o cupom: ele é registrado na Porto antes de o status mudar. */
  @Post(':publicId/approve')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Cadastro aprovado e cupom emitido' })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  @ApiConflictResponse({ description: 'Cadastro já decidido ou código de cupom em uso' })
  @ApiServiceUnavailableResponse({
    description: 'A Porto Serviços não respondeu, ou recusou a credencial da integração',
  })
  approve(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() body: ApproveAffiliateRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    return this.approveAffiliateUseCase.execute({
      publicId,
      actorPublicId: actor.publicId,
      couponCode: body.couponCode,
      couponDiscountPercent: body.couponDiscountPercent,
    });
  }

  @Post(':publicId/reject')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Cadastro reprovado' })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  @ApiConflictResponse({ description: 'Cadastro já decidido' })
  reject(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() body: RejectAffiliateRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    return this.rejectAffiliateUseCase.execute({
      publicId,
      actorPublicId: actor.publicId,
      reason: body.reason.trim(),
    });
  }

  /**
   * Desativar, reativar ou mudar o percentual — o RF-15, que substitui a
   * exclusão para preservar o histórico de vendas. A Porto registra a mudança
   * antes de ela ser gravada aqui, e a trilha do cupom guarda quem pediu.
   */
  @Patch(':publicId/coupon')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: CouponSummaryResponseDto })
  @ApiBadRequestResponse({ description: 'Nada para alterar, ou percentual fora de 1 a 25' })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado, ou cadastro ainda sem cupom' })
  @ApiConflictResponse({ description: 'A Porto Serviços recusou os dados' })
  @ApiServiceUnavailableResponse({
    description: 'A Porto Serviços não respondeu, ou recusou a credencial da integração',
  })
  changeCoupon(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() body: ChangeCouponRequestDto,
    @Actor() actor: ActorInfo,
  ): Promise<CouponSummaryResponseDto> {
    return this.changeAffiliateCouponUseCase.execute({
      publicId,
      actorPublicId: actor.publicId,
      status: body.status,
      discountPercent: body.discountPercent,
    });
  }
}
