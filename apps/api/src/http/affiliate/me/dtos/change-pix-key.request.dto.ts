import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PixKeyTypeEnum } from '@porto/contracts';
import { ChangePixKeyInput } from '@Application/affiliates/change-pix-key.use-case';

/**
 * Espelha o `changePixKeySchema` de `@porto/contracts`. Só a chave e a senha que
 * a confirma: com o `forbidNonWhitelisted` do `ValidationPipe`, qualquer outro
 * dado do cadastro no corpo é 400.
 */
export class ChangePixKeyRequestDto implements Omit<ChangePixKeyInput, 'userPublicId'> {
  @ApiProperty({ enum: PixKeyTypeEnum, example: PixKeyTypeEnum.PHONE })
  @IsEnum(PixKeyTypeEnum, { message: 'Tipo de chave PIX inválido.' })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString({ message: 'Informe a chave PIX.' })
  @IsNotEmpty({ message: 'Informe a chave PIX.' })
  @MaxLength(140, { message: 'Informe a chave PIX.' })
  @Transform(({ value }: { value: string }) => value?.trim())
  pixKey: string;

  @ApiProperty({ description: 'A senha atual, que confirma a troca' })
  @IsString({ message: 'Informe sua senha atual.' })
  @IsNotEmpty({ message: 'Informe sua senha atual.' })
  currentPassword: string;
}
