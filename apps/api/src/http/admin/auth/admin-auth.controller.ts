import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminLoginUseCase } from '@Application/auth/admin-login.use-case';
import { Public } from '@Http/shared/decorators/public.decorator';
import { AdminLoginRequestDto } from './dtos/admin-login.request.dto';
import { AdminLoginResponseDto } from './dtos/admin-login.response.dto';

@ApiTags('admin/auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminLoginUseCase: AdminLoginUseCase) {}

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
}
