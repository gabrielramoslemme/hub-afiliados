import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AffiliateLoginUseCase } from '@Application/auth/affiliate-login.use-case';
import { SetPasswordUseCase } from '@Application/auth/set-password.use-case';
import { Public } from '@Http/shared/decorators/public.decorator';
import { AffiliateLoginRequestDto } from './dtos/affiliate-login.request.dto';
import { AffiliateLoginResponseDto } from './dtos/affiliate-login.response.dto';
import { SetPasswordRequestDto } from './dtos/set-password.request.dto';

@ApiTags('affiliate/auth')
@Controller('affiliate/auth')
export class AffiliateAuthController {
  constructor(
    private readonly affiliateLoginUseCase: AffiliateLoginUseCase,
    private readonly setPasswordUseCase: SetPasswordUseCase,
  ) {}

  @Post('login')
  @Public()
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha definida' })
  @ApiBadRequestResponse({ description: 'Link usado, vencido ou adulterado' })
  setPassword(@Body() body: SetPasswordRequestDto): Promise<void> {
    return this.setPasswordUseCase.execute(body);
  }
}
