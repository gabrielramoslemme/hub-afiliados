import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AffiliateLoginUseCase } from '@Application/auth/affiliate-login.use-case';
import { RequestPasswordResetUseCase } from '@Application/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@Application/auth/reset-password.use-case';
import { RevokeSessionsUseCase } from '@Application/auth/revoke-sessions.use-case';
import { SetPasswordUseCase } from '@Application/auth/set-password.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { Public } from '@Http/shared/decorators/public.decorator';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { ForgotPasswordRequestDto } from '@Http/shared/dtos/forgot-password.request.dto';
import { SetPasswordRequestDto } from '@Http/shared/dtos/set-password.request.dto';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import {
  LinkRedemptionThrottle,
  PasswordAttemptThrottle,
  RecoveryThrottle,
} from '@Http/shared/throttling/throttle-limits';
import { AffiliateLoginRequestDto } from './dtos/affiliate-login.request.dto';
import { AffiliateLoginResponseDto } from './dtos/affiliate-login.response.dto';

@ApiTags('affiliate/auth')
@Controller('affiliate/auth')
export class AffiliateAuthController {
  constructor(
    private readonly affiliateLoginUseCase: AffiliateLoginUseCase,
    private readonly setPasswordUseCase: SetPasswordUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly revokeSessionsUseCase: RevokeSessionsUseCase,
  ) {}

  /** Sair encerra a sessão no servidor: o token para de valer, não só o cookie. */
  @Post('logout')
  @UseGuards(AffiliateGuard)
  @Roles(UserRoleEnum.AFFILIATE)
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
  @ApiOkResponse({ type: AffiliateLoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credencial inválida ou senha ainda não definida' })
  @ApiForbiddenResponse({ description: 'Cadastro em análise ou reprovado' })
  login(@Body() body: AffiliateLoginRequestDto): Promise<AffiliateLoginResponseDto> {
    return this.affiliateLoginUseCase.execute(body);
  }

  /*
    Pública porque é o que a pessoa tem antes de ter senha: quem autentica a
    chamada é o token de uso único do corpo, não uma sessão.
  */
  @Post('set-password')
  @Public()
  @LinkRedemptionThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha definida' })
  @ApiBadRequestResponse({ description: 'Link usado, vencido ou adulterado' })
  setPassword(@Body() body: SetPasswordRequestDto): Promise<void> {
    return this.setPasswordUseCase.execute(body);
  }

  /*
    Pública pela mesma razão, levada ao limite: quem pede recuperação perdeu
    justamente a credencial. A resposta é sempre 204 — exista ou não conta com
    aquele e-mail —, porque a diferença contaria quem participa do programa.
  */
  @Post('forgot-password')
  @Public()
  @RecoveryThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Pedido recebido; a resposta não revela se a conta existe' })
  forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    return this.requestPasswordResetUseCase.execute({
      email: body.email,
      audience: AuthAudienceEnum.AFFILIATE,
    });
  }

  @Post('reset-password')
  @Public()
  @LinkRedemptionThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha redefinida' })
  @ApiBadRequestResponse({ description: 'Link usado, vencido, adulterado ou do outro canal' })
  resetPassword(@Body() body: SetPasswordRequestDto): Promise<void> {
    return this.resetPasswordUseCase.execute({ ...body, audience: AuthAudienceEnum.AFFILIATE });
  }
}
