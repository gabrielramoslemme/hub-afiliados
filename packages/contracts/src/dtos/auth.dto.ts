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
/** O que o painel mostra de quem está logado, lido da API a cada página. */
export type AdminMeResponse = AdminLoginResponse['user'];

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

/** O bcrypt ignora o que passa de 72 bytes: acima disso, a senha não seria a digitada. */
const PASSWORD_MAX_BYTES = 72;

/**
 * As regras da senha, na ordem em que a tela as lista. Mora aqui, e não num
 * schema só, porque a API confere a mesma lista no DTO: um POST montado à mão
 * não pode gravar a senha que a tela recusaria.
 */
export const PASSWORD_RULES: readonly { message: string; test: (password: string) => boolean }[] = [
  { message: 'Use ao menos 12 caracteres.', test: (password) => password.length >= 12 },
  {
    message: 'Use no máximo 72 caracteres.',
    test: (password) => new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
  },
  { message: 'Inclua uma letra maiúscula.', test: (password) => /\p{Lu}/u.test(password) },
  { message: 'Inclua uma letra minúscula.', test: (password) => /\p{Ll}/u.test(password) },
  { message: 'Inclua um número.', test: (password) => /\p{Nd}/u.test(password) },
  {
    message: 'Inclua um caractere especial, como ! @ # ou $.',
    test: (password) => /[^\p{L}\p{N}\s]/u.test(password),
  },
];

/** As regras numa frase, para a dica do campo: a pessoa sabe o que vale antes de errar. */
export const PASSWORD_POLICY_HINT =
  'Ao menos 12 caracteres, com letra maiúscula, minúscula, número e caractere especial.';

/** A primeira regra que a senha descumpre, ou nulo quando ela atende a todas. */
export function passwordPolicyIssue(password: string): string | null {
  return PASSWORD_RULES.find((rule) => !rule.test(password))?.message ?? null;
}

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().superRefine((password, ctx) => {
      const issue = passwordPolicyIssue(password);
      if (issue) ctx.addIssue({ code: 'custom', message: issue });
    }),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não conferem',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
