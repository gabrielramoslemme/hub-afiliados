import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Espelha o `resetPasswordSchema` de `@porto/contracts` — o mesmo schema serve
 * às telas de definir e de redefinir senha, porque a forma é a mesma. A
 * confirmação de senha não chega aqui: ela existe para a pessoa não errar a
 * digitação, e conferir isso é do formulário, não da API.
 *
 * Mora em `shared` porque atende três rotas em dois canais: definir a senha
 * depois da aprovação, e redefinir pelo link de recuperação no portal e no
 * painel. Quem diz de quem é o token é a rota, nunca o corpo.
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
