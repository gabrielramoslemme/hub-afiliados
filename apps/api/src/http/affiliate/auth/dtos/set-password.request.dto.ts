import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Espelha o `resetPasswordSchema` de `@porto/contracts` — o mesmo schema serve
 * às duas telas, definir e recuperar, porque a forma é a mesma. A confirmação
 * de senha não chega aqui: ela existe para a pessoa não errar a digitação, e
 * conferir isso é do formulário, não da API.
 */
export class SetPasswordRequestDto {
  @ApiProperty({ description: 'O token em claro, como veio no link do e-mail' })
  @IsString()
  @IsNotEmpty({ message: 'Link inválido.' })
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: 'A senha precisa ter ao menos 8 caracteres' })
  @MinLength(8, { message: 'A senha precisa ter ao menos 8 caracteres' })
  password: string;
}
