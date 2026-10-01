import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { COUPON_GATEWAY } from '../src/domain/coupons/coupon-gateway';
import { MAILER } from '../src/domain/notifications/mailer';
import { SENSITIVE_THROTTLER } from '../src/http/shared/throttling/throttle-limits';
import type { MailService } from '../src/infra/services/email/mail.service';
import { MAIL_PROVIDER } from '../src/infra/services/email/mail-provider.interface';
import { PostgresThrottlerStorage } from '../src/infra/services/throttling/postgres-throttler.storage';
import { RoutedThrottlerStorage } from '../src/infra/services/throttling/routed-throttler.storage';
import { FakeCouponGateway } from '../src/testing/fakes/fake-coupon.gateway';
import { FakeMailProvider } from '../src/testing/fakes/fake-mail.provider';
import { ResettableThrottlerStorage } from '../src/testing/fakes/resettable-throttler.storage';

type Imports = NonNullable<ModuleMetadata['imports']>;

/*
  Ponto de partida de todo e2e. A API sempre fala com a Porto: o `AppModule` cru
  registraria cupom de verdade com as credenciais do `.env`, e o registro nunca
  esquece um código — a segunda rodada da suíte já voltaria 409. O e-mail segue
  a mesma lógica: a API sempre envia pelo Resend, e cada cadastro do teste sairia
  de verdade. As trocas moram aqui, e não em cada spec, para o próximo
  spec não depender de alguém lembrar.
*/
function e2eTestingSetup(extraImports: Imports) {
  // O limite curto conta no Postgres de verdade, como em produção; só a parte em
  // memória é trocada, para o teste conseguir zerá-la.
  const throttleMemory = new ResettableThrottlerStorage();

  const builder = Test.createTestingModule({ imports: [AppModule, ...extraImports] })
    .overrideProvider(COUPON_GATEWAY)
    .useValue(new FakeCouponGateway())
    .overrideProvider(MAIL_PROVIDER)
    .useValue(new FakeMailProvider())
    .overrideProvider(ThrottlerStorage)
    .useFactory({
      inject: [DataSource],
      factory: (dataSource: DataSource) =>
        new RoutedThrottlerStorage(throttleMemory, new PostgresThrottlerStorage(dataSource), [
          SENSITIVE_THROTTLER,
        ]),
    });

  return { builder, throttleMemory };
}

export function createE2eTestingModule(extraImports: Imports = []): TestingModuleBuilder {
  return e2eTestingSetup(extraImports).builder;
}

export interface E2eApp {
  app: INestApplication;
  dataSource: DataSource;
  mail: FakeMailProvider;
  throttlerStorage: ResettableThrottlerStorage;
}

/** A aplicação configurada como o `main.ts` configura, pronta para o `supertest`. */
export async function createE2eApp(): Promise<E2eApp> {
  const { builder, throttleMemory } = e2eTestingSetup([]);
  const moduleRef = await builder.compile();
  // O mesmo `rawBody` do `main.ts`: sem ele o guard do webhook não enxerga os
  // bytes assinados, e toda chamada assinada do teste voltaria 401.
  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app);
  /*
    Escutando de verdade, e em 127.0.0.1. Sem isso o `supertest` sobe um servidor
    por requisição em `::` e conecta em 127.0.0.1 na mesma porta — que, com outro
    servidor local de pé (o `next dev`, o Playwright da web), pode ser dele: o
    teste recebe o 404 de outra aplicação, de vez em quando.
  */
  await app.listen(0, '127.0.0.1');

  return {
    app,
    dataSource: app.get(DataSource),
    mail: app.get<FakeMailProvider>(MAIL_PROVIDER),
    throttlerStorage: throttleMemory,
  };
}

/*
  Todas as tabelas, num lugar só: a lista copiada em cada spec já tinha ficado
  para trás quando o cupom ganhou tabela, e só funcionava pelo `CASCADE`.
*/
const TABLES = [
  'throttle_counters',
  'training_module_completions',
  'training_modules',
  'promotional_materials',
  'audit_logs',
  'porto_incentive_events',
  'affiliate_sales',
  'affiliate_coupons',
  'password_reset_tokens',
  'affiliates',
  'users',
];

/**
 * A recuperação de senha responde antes de o e-mail sair. O teste que lê o link
 * espera os envios em curso, como o desligamento da API espera.
 */
export function mailSettled(e2e: E2eApp): Promise<void> {
  return e2e.app.get<MailService>(MAILER).drain();
}

export async function resetDatabase({ dataSource, mail, throttlerStorage }: E2eApp): Promise<void> {
  await dataSource.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  mail.clear();
  // A suíte inteira conecta do mesmo 127.0.0.1: sem zerar, a conta do limite
  // passaria de um teste para o seguinte.
  throttlerStorage.reset();
}
