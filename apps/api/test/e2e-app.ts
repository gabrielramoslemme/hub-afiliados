import { type INestApplication, Module, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { COUPON_GATEWAY } from '../src/domain/coupons/coupon-gateway';
import { PAYOUT_GATEWAY } from '../src/domain/withdrawals/payout-gateway';
import { JobsModule } from '../src/infra/di/jobs/jobs.module';
import { MAIL_PROVIDER } from '../src/infra/services/email/mail-provider.interface';
import { FakeCouponGateway } from '../src/testing/fakes/fake-coupon.gateway';
import { FakeMailProvider } from '../src/testing/fakes/fake-mail.provider';
import { FakePayoutGateway } from '../src/testing/fakes/fake-payout.gateway';

type Imports = NonNullable<ModuleMetadata['imports']>;

/** No lugar do `JobsModule`: o e2e chama a reconciliação pelo use case, sem cron. */
@Module({})
class NoJobsModule {}

/*
  Ponto de partida de todo e2e. A API sempre fala com a Porto: o `AppModule` cru
  registraria cupom de verdade com as credenciais do `.env`, e o registro nunca
  esquece um código — a segunda rodada da suíte já voltaria 409. O e-mail segue
  a mesma lógica: com `MAIL_PROVIDER=resend` no `.env`, cada cadastro do teste
  sairia de verdade. O saque é o mesmo problema ao contrário: sem credencial da
  Transfeera no `.env`, o `AppModule` cru responderia WDR-003 a todo pedido; com
  credencial de verdade, pagaria de verdade. As trocas moram aqui, e não em cada
  spec, para o próximo spec não depender de alguém lembrar.
*/
export function createE2eTestingModule(extraImports: Imports = []): TestingModuleBuilder {
  return Test.createTestingModule({ imports: [AppModule, ...extraImports] })
    .overrideProvider(COUPON_GATEWAY)
    .useValue(new FakeCouponGateway())
    .overrideProvider(MAIL_PROVIDER)
    .useValue(new FakeMailProvider())
    .overrideProvider(PAYOUT_GATEWAY)
    .useValue(new FakePayoutGateway())
    .overrideModule(JobsModule)
    .useModule(NoJobsModule);
}

export interface E2eApp {
  app: INestApplication;
  dataSource: DataSource;
  mail: FakeMailProvider;
  payouts: FakePayoutGateway;
}

/** A aplicação configurada como o `main.ts` configura, pronta para o `supertest`. */
export async function createE2eApp(): Promise<E2eApp> {
  const moduleRef = await createE2eTestingModule().compile();
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
    payouts: app.get<FakePayoutGateway>(PAYOUT_GATEWAY),
  };
}

/*
  Todas as tabelas, num lugar só: a lista copiada em cada spec já tinha ficado
  para trás quando o cupom ganhou tabela, e só funcionava pelo `CASCADE`.
*/
const TABLES = [
  'payout_events',
  'affiliate_withdrawals',
  'audit_logs',
  'porto_incentive_events',
  'affiliate_sales',
  'affiliate_coupons',
  'password_reset_tokens',
  'affiliates',
  'users',
];

export async function resetDatabase({ dataSource, mail, payouts }: E2eApp): Promise<void> {
  await dataSource.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  mail.clear();
  payouts.reset();
}
