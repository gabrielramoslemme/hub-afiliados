import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GetAffiliateUseCase } from '@Application/affiliates/get-affiliate.use-case';
import { ListAffiliateStatusHistoryUseCase } from '@Application/affiliates/list-affiliate-status-history.use-case';
import { ListAffiliatesUseCase } from '@Application/affiliates/list-affiliates.use-case';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { AffiliateDetailResponseDto } from './dtos/affiliate-detail.response.dto';
import { PaginatedAffiliatesResponseDto } from './dtos/affiliate-list-item.response.dto';
import { AffiliateStatusHistoryResponseDto } from './dtos/affiliate-status-history.response.dto';
import { ListAffiliatesQueryDto } from './dtos/list-affiliates.query.dto';

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
}
