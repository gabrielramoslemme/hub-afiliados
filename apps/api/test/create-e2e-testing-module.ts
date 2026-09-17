import type { ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { COUPON_GATEWAY } from '../src/domain/coupons/coupon-gateway';
import { FakeCouponGateway } from '../src/testing/fakes/fake-coupon.gateway';

type Imports = NonNullable<ModuleMetadata['imports']>;

/*
  Ponto de partida de todo e2e. A API sempre fala com a Porto: o `AppModule` cru
  registraria cupom de verdade com as credenciais do `.env`, e o registro nunca
  esquece um código — a segunda rodada da suíte já voltaria 409. A troca mora
  aqui, e não em cada spec, para o próximo spec não depender de alguém lembrar.
*/
export function createE2eTestingModule(extraImports: Imports = []): TestingModuleBuilder {
  return Test.createTestingModule({ imports: [AppModule, ...extraImports] })
    .overrideProvider(COUPON_GATEWAY)
    .useValue(new FakeCouponGateway());
}
