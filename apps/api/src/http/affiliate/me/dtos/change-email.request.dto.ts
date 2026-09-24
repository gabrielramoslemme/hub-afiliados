import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ChangeEmailInput } from '@Application/affiliates/change-email.use-case';

/**
 * Espelha o `changeEmailSchema` de `@porto/contracts`. Só o e-mail e a senha que
 * a confirma: com o `forbidNonWhitelisted` do `ValidationPipe`, qualquer outro
 * dado do cadastro no corpo é 400.
 */
export class ChangeEmailRequestDto implements Omit<ChangeEmailInput, 'userPublicId'> {
  @ApiProperty({ example: 'marina@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(255, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ description: 'A senha atual, que confirma a troca' })
  @IsString({ message: 'Informe sua senha atual.' })
  @IsNotEmpty({ message: 'Informe sua senha atual.' })
  currentPassword: string;
}
