import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { CreateAffiliateInput } from '@Application/affiliates/create-affiliate.use-case';

/** Nome e sobrenome: o cadastro do CPF sempre tem os dois, e o AC pede o nome completo. */
const FULL_NAME_PATTERN = /^\S+(\s+\S+)+$/;
/*
  Forma, não cálculo: o RG não tem formato nacional, cada estado emite o seu e há
  UF que usa letra como dígito verificador. Só a pontuação de RG é tolerada —
  aceitar qualquer símbolo faria `12345678/SP` virar o RG `12345678SP`.
*/
const RG_PATTERN = /^[A-Za-z0-9]{5,20}$/;
const SOCIAL_HANDLE_PATTERN = /^@?[A-Za-z0-9._-]{1,30}$/;

function informedSocialProfile(dto: CreateAffiliateRequestDto): boolean {
  return Boolean(dto.socialNetwork) || Boolean(dto.socialHandle);
}

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

  @ApiProperty({ example: '12.345.678-X' })
  @IsString({ message: 'Informe um RG válido.' })
  @Matches(RG_PATTERN, { message: 'Informe um RG válido.' })
  @Transform(({ value }: { value: string }) => value?.replace(/[.\-\s]/g, '').toUpperCase())
  rg: string;

  @ApiProperty({ enum: PixKeyTypeEnum, example: PixKeyTypeEnum.EMAIL })
  @IsEnum(PixKeyTypeEnum, { message: 'Tipo de chave PIX inválido.' })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: 'marina@email.com' })
  @IsString({ message: 'Informe a chave PIX.' })
  @IsNotEmpty({ message: 'Informe a chave PIX.' })
  @MaxLength(140, { message: 'Informe a chave PIX.' })
  @Transform(({ value }: { value: string }) => value?.trim())
  pixKey: string;

  /*
    Rede e `@` são opcionais, mas indivisíveis: com um dos dois preenchido, os
    dois passam a ser cobrados. `@` sem rede não abre perfil nenhum, e rede sem
    `@` não diz onde procurar. Nada de `@IsOptional` aqui — ele pula a validação
    inteira quando o campo vem ausente, que é justamente o caso a recusar.
  */
  @ApiPropertyOptional({ enum: SocialNetworkEnum, example: SocialNetworkEnum.INSTAGRAM })
  @ValidateIf(informedSocialProfile)
  @IsEnum(SocialNetworkEnum, { message: 'Escolha a rede social do @ informado.' })
  socialNetwork?: SocialNetworkEnum | null;

  @ApiPropertyOptional({ example: '@marina.ferraz' })
  // Com `stopAtFirstError`, a mensagem que sai é a do decorator mais abaixo: a
  // ausência do campo é o caso a nomear primeiro, o formato só depois.
  @ValidateIf(informedSocialProfile)
  @Matches(SOCIAL_HANDLE_PATTERN, { message: 'Informe um @ válido, sem espaços.' })
  @IsString({ message: 'Informe o @ da rede escolhida.' })
  @IsNotEmpty({ message: 'Informe o @ da rede escolhida.' })
  @Transform(({ value }: { value: string }) => value?.trim())
  socialHandle?: string | null;

  /*
    O aceite é campo do cadastro, não pressuposto do envio: sem ele marcado a
    requisição é recusada aqui, antes do use case. `Equals(true)` e não
    `IsBoolean` sozinho — `false` é um booleano válido e um cadastro inválido.
  */
  @ApiProperty({ example: true, description: 'Aceite do Regulamento do programa.' })
  @IsBoolean({ message: 'É preciso aceitar o Regulamento do programa.' })
  @Equals(true, { message: 'É preciso aceitar o Regulamento do programa.' })
  termsAccepted: boolean;
}
