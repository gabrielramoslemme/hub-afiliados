import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { PixKeyTypeEnum } from '@porto/contracts';
import { CreateAffiliateInput } from '@Application/affiliates/create-affiliate.use-case';

/** Nome e sobrenome: o cadastro do CPF sempre tem os dois, e o AC pede o nome completo. */
const FULL_NAME_PATTERN = /^\S+(\s+\S+)+$/;

export class CreateAffiliateRequestDto implements CreateAffiliateInput {
  @ApiProperty({ example: 'Marina Ferraz' })
  @IsString({ message: 'Informe o nome completo.' })
  @IsNotEmpty({ message: 'Informe o nome completo.' })
  @MaxLength(255, { message: 'Informe o nome completo.' })
  @Matches(FULL_NAME_PATTERN, { message: 'Informe o nome completo.' })
  @Transform(({ value }: { value: string }) => value?.trim())
  fullName: string;

  @ApiProperty({ example: 'marina@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(255, { message: 'Informe um e-mail válido.' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: '529.982.247-25' })
  @IsString({ message: 'Informe um CPF válido.' })
  @Length(11, 14, { message: 'Informe um CPF válido.' })
  cpf: string;

  @ApiProperty({ enum: PixKeyTypeEnum, example: PixKeyTypeEnum.EMAIL })
  @IsEnum(PixKeyTypeEnum, { message: 'Tipo de chave PIX inválido.' })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: 'marina@email.com' })
  @IsString({ message: 'Informe a chave PIX.' })
  @IsNotEmpty({ message: 'Informe a chave PIX.' })
  @MaxLength(140, { message: 'Informe a chave PIX.' })
  @Transform(({ value }: { value: string }) => value?.trim())
  pixKey: string;

  @ApiProperty({ example: '1.0-homolog' })
  @IsString({ message: 'Informe a versão dos termos aceita.' })
  @IsNotEmpty({ message: 'Informe a versão dos termos aceita.' })
  @MaxLength(30, { message: 'Informe a versão dos termos aceita.' })
  termsVersion: string;

  /**
   * A borda cobra só o tipo. Exigir `true` aqui esconderia o
   * `TERMS_NOT_ACCEPTED` do use case atrás de um erro de validação sem `code`,
   * e é por esse código que o app decide o que dizer.
   */
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'Informe o aceite dos termos.' })
  termsAccepted: boolean;
}
