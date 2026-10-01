import { applyDecorators, ExecutionContext, SetMetadata } from '@nestjs/common';
import { hours, minutes, Throttle, ThrottlerOptions } from '@nestjs/throttler';

/** O limite curto. A contagem dele mora no Postgres e sobrevive a deploy. */
export const SENSITIVE_THROTTLER = 'sensitive';

const SENSITIVE_ROUTE = 'throttle:sensitive-route';

interface SensitiveLimit {
  limit: number;
  ttl: number;
}

/*
  Quem passa do limite curto espera o bloqueio inteiro, e não só a janela andar:
  o bloqueio dura o mesmo que a janela.
*/
function sensitive({ limit, ttl }: SensitiveLimit): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(SENSITIVE_ROUTE, true),
    Throttle({ [SENSITIVE_THROTTLER]: { limit, ttl, blockDuration: ttl } }),
  );
}

/*
  Os dois limites, na ordem em que o guard os confere. O folgado vale em toda
  rota e fica em memória: existe para conter abuso em volume, e perder a conta
  num deploy não custa nada. O curto só vale onde um dos decorators abaixo o
  pôs — sem o `skipIf`, os valores de módulo dele valeriam em toda rota, e cada
  requisição viraria uma escrita no banco.
*/
export const THROTTLERS: ThrottlerOptions[] = [
  { name: 'default', ttl: minutes(1), limit: 300 },
  {
    name: SENSITIVE_THROTTLER,
    ttl: minutes(15),
    limit: 10,
    skipIf: (context: ExecutionContext) =>
      !Reflect.getMetadata(SENSITIVE_ROUTE, context.getHandler()),
  },
];

/** Login e toda conferência de senha com a sessão aberta: dez erros e espera. */
export function PasswordAttemptThrottle(): MethodDecorator & ClassDecorator {
  return sensitive({ limit: 10, ttl: minutes(15) });
}

/**
 * "Esqueci minha senha" manda e-mail. Por conta, o use case já limita a cinco
 * por hora; aqui o limite é de quem pede, para ninguém varrer e-mails em massa.
 */
export function RecoveryThrottle(): MethodDecorator & ClassDecorator {
  return sensitive({ limit: 10, ttl: minutes(15) });
}

/** O link do e-mail vira senha; adivinhar token de 32 bytes não é o risco, o volume é. */
export function LinkRedemptionThrottle(): MethodDecorator & ClassDecorator {
  return sensitive({ limit: 10, ttl: minutes(15) });
}

/**
 * O cadastro manda e-mail para qualquer endereço e responde se o CPF já tem
 * conta: por hora, e pouco, para nem a caixa de outra pessoa nem a lista de
 * afiliados virarem alvo em massa.
 */
export function SignUpThrottle(): MethodDecorator & ClassDecorator {
  return sensitive({ limit: 5, ttl: hours(1) });
}
