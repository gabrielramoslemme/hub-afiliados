import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthAudienceEnum } from '@porto/contracts';
import { AdminLoginUseCase } from '@Application/auth/admin-login.use-case';
import { RequestPasswordResetUseCase } from '@Application/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@Application/auth/reset-password.use-case';
import { Public } from '@Http/shared/decorators/public.decorator';
import { ForgotPasswordRequestDto } from '@Http/shared/dtos/forgot-password.request.dto';
import { SetPasswordRequestDto } from '@Http/shared/dtos/set-password.request.dto';
import { AdminLoginRequestDto } from './dtos/admin-login.request.dto';
import { AdminLoginResponseDto } from './dtos/admin-login.response.dto';

@ApiTags('admin/auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminLoginUseCase: AdminLoginUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('login')
  @Public()
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha redefinida' })
  @ApiBadRequestResponse({ description: 'Link usado, vencido, adulterado ou do outro canal' })
  resetPassword(@Body() body: SetPasswordRequestDto): Promise<void> {
    return this.resetPasswordUseCase.execute({ ...body, audience: AuthAudienceEnum.ADMIN });
  }
}
