import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AdminLoginUseCase } from '@Application/auth/admin-login.use-case';
import { RequestPasswordResetUseCase } from '@Application/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@Application/auth/reset-password.use-case';
import { RevokeSessionsUseCase } from '@Application/auth/revoke-sessions.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { Public } from '@Http/shared/decorators/public.decorator';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { ForgotPasswordRequestDto } from '@Http/shared/dtos/forgot-password.request.dto';
import { SetPasswordRequestDto } from '@Http/shared/dtos/set-password.request.dto';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import {
  LinkRedemptionThrottle,
  PasswordAttemptThrottle,
  RecoveryThrottle,
} from '@Http/shared/throttling/throttle-limits';
import { AdminLoginRequestDto } from './dtos/admin-login.request.dto';
import { AdminLoginResponseDto } from './dtos/admin-login.response.dto';

@ApiTags('admin/auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminLoginUseCase: AdminLoginUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly revokeSessionsUseCase: RevokeSessionsUseCase,
  ) {}

  /** Sair encerra a sessão no servidor: o token para de valer, não só o cookie. */
  @Post('logout')
  @UseGuards(AdminGuard)
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Sessões encerradas' })
  async logout(@Actor() actor: ActorInfo): Promise<void> {
    await this.revokeSessionsUseCase.execute(actor.publicId);
  }

  @Post('login')
  @Public()
  @PasswordAttemptThrottle()
  @ApiTooManyRequestsResponse({ description: 'Tentativas demais; o Retry-After diz quando voltar' })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminLoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Credencial inválida, senha não definida ou conta inativa',
  })
  login(@Body() body: AdminLoginRequestDto): Promise<AdminLoginResponseDto> {
    return this.adminLoginUseCase.execute(body);
  }

  /*
    As duas são públicas porque quem pede recuperação perdeu justamente a
    credencial. A resposta é sempre 204, exista ou não conta com aquele e-mail:
    a diferença entregaria a lista de quem opera o painel.

    A audiência sai daqui, nunca do corpo — é ela que faz um link do painel não
    valer na tela do afiliado.
  */
  @Post('forgot-password')
  @Public()
  @RecoveryThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Pedido recebido; a resposta não revela se a conta existe' })
  forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    return this.requestPasswordResetUseCase.execute({
      email: body.email,
      audience: AuthAudienceEnum.ADMIN,
    });
  }

  @Post('reset-password')
  @Public()
  @LinkRedemptionThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha redefinida' })
  @ApiBadRequestResponse({ description: 'Link usado, vencido, adulterado ou do outro canal' })
  resetPassword(@Body() body: SetPasswordRequestDto): Promise<void> {
    return this.resetPasswordUseCase.execute({ ...body, audience: AuthAudienceEnum.ADMIN });
  }
}
