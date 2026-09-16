import { z } from 'zod';
import type { AffiliateStatusEnum, UserRoleEnum } from '../enums';

export const adminLoginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;

export interface AdminLoginResponse {
  accessToken: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    role: UserRoleEnum;
    shouldChangePassword: boolean;
  };
}

/*
  Mesma forma do login do operador, e ainda assim um schema próprio: as duas
  telas divergem — a do afiliado oferece o cadastro a quem ainda não tem conta,
  a do painel não — e compartilhar o schema faria a divergência quebrar a tela
  errada.
*/
export const affiliateLoginSchema = z.object({
  /*
    Normaliza antes de validar, como `createAffiliateSchema`: quem se cadastrou
    digitando com maiúscula não pode ficar de fora ao voltar, e um espaço colado
    pelo gerenciador de senhas reprovaria o e-mail inteiro.
  */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => z.email().safeParse(value).success, 'Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export type AffiliateLoginRequest = z.infer<typeof affiliateLoginSchema>;

export interface AffiliateLoginResponse {
  accessToken: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    status: AffiliateStatusEnum;
    /** Nulo enquanto a Porto não emitir o cupom do afiliado aprovado. */
    coupon: string | null;
  };
}

/**
 * Serve às duas telas de "esqueci minha senha", a do afiliado e a do painel. O
 * e-mail é normalizado como nos logins: quem pede recuperação está com pressa,
 * e um espaço colado pelo gerenciador de senhas reprovaria o pedido inteiro.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => z.email().safeParse(value).success, 'Informe um e-mail válido.'),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não conferem',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
