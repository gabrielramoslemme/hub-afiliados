import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { COUPON_GATEWAY } from '../src/domain/coupons/coupon-gateway';
import { MAIL_PROVIDER } from '../src/infra/services/email/mail-provider.interface';
import { FakeCouponGateway } from '../src/testing/fakes/fake-coupon.gateway';
import { FakeMailProvider } from '../src/testing/fakes/fake-mail.provider';

type Imports = NonNullable<ModuleMetadata['imports']>;

/*
  Ponto de partida de todo e2e. A API sempre fala com a Porto: o `AppModule` cru
  registraria cupom de verdade com as credenciais do `.env`, e o registro nunca
  esquece um código — a segunda rodada da suíte já voltaria 409. O e-mail segue
  a mesma lógica: com `MAIL_PROVIDER=resend` no `.env`, cada cadastro do teste
  sairia de verdade. As trocas moram aqui, e não em cada spec, para o próximo
  spec não depender de alguém lembrar.
*/
export function createE2eTestingModule(extraImports: Imports = []): TestingModuleBuilder {
  return Test.createTestingModule({ imports: [AppModule, ...extraImports] })
    .overrideProvider(COUPON_GATEWAY)
    .useValue(new FakeCouponGateway())
    .overrideProvider(MAIL_PROVIDER)
    .useValue(new FakeMailProvider());
}

export interface E2eApp {
  app: INestApplication;
  dataSource: DataSource;
  mail: FakeMailProvider;
}

/** A aplicação configurada como o `main.ts` configura, pronta para o `supertest`. */
export async function createE2eApp(): Promise<E2eApp> {
  const moduleRef = await createE2eTestingModule().compile();
  const app = moduleRef.createNestApplication();
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
  };
}

/*
  Todas as tabelas, num lugar só: a lista copiada em cada spec já tinha ficado
  para trás quando o cupom ganhou tabela, e só funcionava pelo `CASCADE`.
*/
const TABLES = [
  'affiliate_coupon_history',
  'affiliate_coupons',
  'affiliate_status_history',
  'password_reset_tokens',
  'affiliates',
  'users',
];

export async function resetDatabase({ dataSource, mail }: E2eApp): Promise<void> {
  await dataSource.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  mail.clear();
}
