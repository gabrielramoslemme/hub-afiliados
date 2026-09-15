import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CheckCouponAvailabilityUseCase } from '@Application/coupons/check-coupon-availability.use-case';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { CouponAvailabilityQueryDto } from './dtos/coupon-availability.query.dto';
import { CouponAvailabilityResponseDto } from './dtos/coupon-availability.response.dto';

@ApiTags('admin/coupons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AdminGuard)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly checkCouponAvailabilityUseCase: CheckCouponAvailabilityUseCase) {}

  /**
   * Consulta, não reserva: o código só fica tomado quando a aprovação o cria e
   * a Porto o registra. Serve para o conflito aparecer no campo enquanto a analista
   * digita, em vez de no meio da aprovação.
   */
  @Get('availability')
  @ApiOkResponse({ type: CouponAvailabilityResponseDto })
  @ApiBadRequestResponse({ description: 'Código fora do formato' })
  @ApiServiceUnavailableResponse({
    description: 'A Porto Serviços não respondeu, ou recusou a credencial da integração',
  })
  async availability(
    @Query() query: CouponAvailabilityQueryDto,
  ): Promise<CouponAvailabilityResponseDto> {
    return CouponAvailabilityResponseDto.from(
      await this.checkCouponAvailabilityUseCase.execute(query.code),
    );
  }
}
