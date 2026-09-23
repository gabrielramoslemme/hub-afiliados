import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_ISSUER, ACCESS_TOKEN_VERIFIER } from '@Domain/auth/access-token';
import { PASSWORD_HASHER } from '@Domain/auth/password-hasher';
import { TOKEN_GENERATOR } from '@Domain/auth/token-generator';
import { WEBHOOK_SIGNATURE_VERIFIER } from '@Domain/auth/webhook-signature-verifier';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { CryptoTokenGenerator } from './crypto-token-generator';
import { HmacWebhookSignatureVerifier } from './hmac-webhook-signature.verifier';
import { JwtAccessTokenService } from './jwt-access-token.service';

/**
 * A biblioteca de assinatura entra aqui e em nenhum outro lugar. Emitir e
 * verificar são dois tokens de DI apontando para a **mesma** instância, via
 * `useExisting`: são contratos diferentes porque quem os consome é diferente,
 * não porque o adapter seja outro.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        secret: configService.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN_SECONDS', { infer: true }) },
      }),
    }),
  ],
  providers: [
    JwtAccessTokenService,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: CryptoTokenGenerator },
    { provide: ACCESS_TOKEN_ISSUER, useExisting: JwtAccessTokenService },
    { provide: ACCESS_TOKEN_VERIFIER, useExisting: JwtAccessTokenService },
    { provide: WEBHOOK_SIGNATURE_VERIFIER, useClass: HmacWebhookSignatureVerifier },
  ],
  exports: [
    PASSWORD_HASHER,
    TOKEN_GENERATOR,
    ACCESS_TOKEN_ISSUER,
    ACCESS_TOKEN_VERIFIER,
    WEBHOOK_SIGNATURE_VERIFIER,
  ],
})
export class AuthServicesModule {}
