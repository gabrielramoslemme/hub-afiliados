import { hours, minutes, Throttle } from '@nestjs/throttler';

/*
  O limite de todas as rotas, folgado: existe para conter abuso em volume, não
  para incomodar quem navega. As rotas que conferem senha, mandam e-mail ou
  criam conta têm o próprio, bem mais curto, e quem passa dele espera o bloqueio
  inteiro — não basta a janela andar.
*/
export const DEFAULT_THROTTLE = { ttl: minutes(1), limit: 300 };

/** Login e toda conferência de senha com a sessão aberta: dez erros e espera. */
export function PasswordAttemptThrottle(): MethodDecorator & ClassDecorator {
  return Throttle({ default: { limit: 10, ttl: minutes(15), blockDuration: minutes(15) } });
}

/**
 * "Esqueci minha senha" manda e-mail. Por conta, o use case já limita a cinco
 * por hora; aqui o limite é de quem pede, para ninguém varrer e-mails em massa.
 */
export function RecoveryThrottle(): MethodDecorator & ClassDecorator {
  return Throttle({ default: { limit: 10, ttl: minutes(15), blockDuration: minutes(15) } });
}

/** O link do e-mail vira senha; adivinhar token de 32 bytes não é o risco, o volume é. */
export function LinkRedemptionThrottle(): MethodDecorator & ClassDecorator {
  return Throttle({ default: { limit: 10, ttl: minutes(15), blockDuration: minutes(15) } });
}

/**
 * O cadastro manda e-mail para qualquer endereço e responde se o CPF já tem
 * conta: por hora, e pouco, para nem a caixa de outra pessoa nem a lista de
 * afiliados virarem alvo em massa.
 */
export function SignUpThrottle(): MethodDecorator & ClassDecorator {
  return Throttle({ default: { limit: 5, ttl: hours(1), blockDuration: hours(1) } });
}
