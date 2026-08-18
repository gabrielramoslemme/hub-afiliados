import { z } from 'zod';
import type { UserRoleEnum } from '../enums';

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

export const forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
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
