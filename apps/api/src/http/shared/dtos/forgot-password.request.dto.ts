import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

/**
 * Mora em `shared` porque os dois canais pedem recuperação com o mesmo corpo —
 * o que muda é a audiência, e ela vem da rota, não do que o cliente manda.
 * Espelha o `forgotPasswordSchema` de `@porto/contracts`.
 */
export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'marina@email.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;
}
