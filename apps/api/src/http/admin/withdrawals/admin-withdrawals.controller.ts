import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GetWithdrawalUseCase } from '@Application/withdrawals/get-withdrawal.use-case';
import { ListWithdrawalsUseCase } from '@Application/withdrawals/list-withdrawals.use-case';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { ListWithdrawalsQueryDto } from './dtos/list-withdrawals.query.dto';
import { WithdrawalDetailResponseDto } from './dtos/withdrawal-detail.response.dto';
import { PaginatedWithdrawalsResponseDto } from './dtos/withdrawal-list-item.response.dto';
import { toRequestedRange } from './requested-range';

@ApiTags('admin/withdrawals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AdminGuard)
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(
    private readonly listWithdrawalsUseCase: ListWithdrawalsUseCase,
    private readonly getWithdrawalUseCase: GetWithdrawalUseCase,
  ) {}

  /** Os saques de todos os afiliados, do pedido mais recente para o mais antigo. */
  @Get()
  @ApiOkResponse({ type: PaginatedWithdrawalsResponseDto })
  async list(@Query() query: ListWithdrawalsQueryDto): Promise<PaginatedWithdrawalsResponseDto> {
    const { requestedFrom, requestedUntil } = toRequestedRange(query);

    return PaginatedWithdrawalsResponseDto.from(
      await this.listWithdrawalsUseCase.execute({
        page: query.page,
        limit: query.limit,
        status: query.status ?? null,
        search: query.search?.trim() || null,
        requestedFrom,
        requestedUntil,
      }),
    );
  }

  @Get(':publicId')
  @ApiOkResponse({ type: WithdrawalDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Saque não encontrado' })
  async detail(
    @Param('publicId', new ParseUUIDPipe()) publicId: string,
  ): Promise<WithdrawalDetailResponseDto> {
    return WithdrawalDetailResponseDto.fromDetail(
      await this.getWithdrawalUseCase.execute(publicId),
    );
  }
}
