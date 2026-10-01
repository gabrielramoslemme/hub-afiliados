import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRoleEnum } from '@porto/contracts';
import { GetOperatorUseCase } from '@Application/auth/get-operator.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { AdminLoginUserDto } from '../auth/dtos/admin-login.response.dto';

@ApiTags('admin/me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente, expirada ou encerrada' })
@UseGuards(AdminGuard)
@Controller('admin/me')
export class AdminMeController {
  constructor(private readonly getOperatorUseCase: GetOperatorUseCase) {}

  /**
   * Quem está logado no painel. O painel lê daqui a cada página, e não de um
   * cookie escrito no login: o que a tela mostra é o que a conta diz agora.
   */
  @Get()
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: AdminLoginUserDto })
  me(@Actor() actor: ActorInfo): Promise<AdminLoginUserDto> {
    return this.getOperatorUseCase.execute(actor.publicId);
  }
}
