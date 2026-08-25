import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApproveAffiliateUseCase } from '@Application/affiliates/approve-affiliate.use-case';
import { GetAffiliateUseCase } from '@Application/affiliates/get-affiliate.use-case';
import { ListAffiliateStatusHistoryUseCase } from '@Application/affiliates/list-affiliate-status-history.use-case';
import { ListAffiliatesUseCase } from '@Application/affiliates/list-affiliates.use-case';
import { RejectAffiliateUseCase } from '@Application/affiliates/reject-affiliate.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { AffiliateDetailResponseDto } from './dtos/affiliate-detail.response.dto';
import { PaginatedAffiliatesResponseDto } from './dtos/affiliate-list-item.response.dto';
import { AffiliateStatusHistoryResponseDto } from './dtos/affiliate-status-history.response.dto';
import { ListAffiliatesQueryDto } from './dtos/list-affiliates.query.dto';
import { RejectAffiliateRequestDto } from './dtos/reject-affiliate.request.dto';

@ApiTags('admin/affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AdminGuard)
@Controller('admin/affiliates')
export class AdminAffiliatesController {
  constructor(
    private readonly listAffiliatesUseCase: ListAffiliatesUseCase,
    private readonly getAffiliateUseCase: GetAffiliateUseCase,
    private readonly listAffiliateStatusHistoryUseCase: ListAffiliateStatusHistoryUseCase,
    private readonly approveAffiliateUseCase: ApproveAffiliateUseCase,
    private readonly rejectAffiliateUseCase: RejectAffiliateUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: PaginatedAffiliatesResponseDto })
  async list(@Query() query: ListAffiliatesQueryDto): Promise<PaginatedAffiliatesResponseDto> {
    const result = await this.listAffiliatesUseCase.execute({
      page: query.page,
      limit: query.limit,
      status: query.status ?? null,
      search: query.search?.trim() || null,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return PaginatedAffiliatesResponseDto.from(result);
  }

  @Get(':publicId')
  @ApiOkResponse({ type: AffiliateDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  async detail(
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ): Promise<AffiliateDetailResponseDto> {
    return AffiliateDetailResponseDto.from(await this.getAffiliateUseCase.execute(publicId));
  }

  @Get(':publicId/history')
  @ApiOkResponse({ type: [AffiliateStatusHistoryResponseDto] })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  async history(
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ): Promise<AffiliateStatusHistoryResponseDto[]> {
    const entries = await this.listAffiliateStatusHistoryUseCase.execute(publicId);

    return entries.map(AffiliateStatusHistoryResponseDto.from);
  }

  @Post(':publicId/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Cadastro aprovado' })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  @ApiConflictResponse({ description: 'Cadastro já decidido' })
  approve(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    return this.approveAffiliateUseCase.execute({ publicId, actorPublicId: actor.publicId });
  }

  @Post(':publicId/reject')
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
}
