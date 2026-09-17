import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { FakeMailProvider } from '../src/testing/fakes/fake-mail.provider';

export const OPERATOR = {
  name: 'Analista Porto',
  email: 'analista@porto.example',
  password: 'MudarAgora!2026',
};

// Custo 10 é caro para pagar a cada teste; o hash é o mesmo em todos eles.
let operatorHash: Promise<string> | undefined;

export async function insertOperator(
  dataSource: DataSource,
  overrides: { isActive?: boolean } = {},
): Promise<void> {
  operatorHash ??= bcrypt.hash(OPERATOR.password, 10);

  await dataSource.query(
    `INSERT INTO users (name, email, password, password_set_at, should_change_password, is_active, type, role)
     VALUES ($1, $2, $3, now(), false, $4, 'ADMIN', 'PORTO_ANALYST')
     ON CONFLICT (email) DO NOTHING`,
    [OPERATOR.name, OPERATOR.email, await operatorHash, overrides.isActive ?? true],
  );
}

/** Cria a analista, se ainda não existir, e devolve o token de uma sessão dela. */
export async function signInOperator(app: INestApplication, dataSource: DataSource) {
  await insertOperator(dataSource);

  const response = await request(app.getHttpServer())
    .post('/v1/admin/auth/login')
    .send({ email: OPERATOR.email, password: OPERATOR.password })
    .expect(200);

  return response.body.accessToken as string;
}

/*
  Três cadastros que não colidem em nada que é único: e-mail, CPF e RG. A chave
  PIX de cada um é diferente do e-mail da conta de propósito — é o que deixa um
  teste afirmar que ela não vazou.
*/
export const MARINA = {
  fullName: 'Marina Ferraz',
  email: 'marina.ferraz@email.com',
  cpf: '529.982.247-25',
  rg: '12.345.678-X',
  pixKeyType: 'EMAIL',
  pixKey: 'pix.marina@email.com',
  socialNetwork: 'INSTAGRAM',
  socialHandle: '@marina.ferraz',
  termsAccepted: true,
};

export const CLEIDE = {
  fullName: 'Cleide Nakamura',
  email: 'cleide.nakamura@email.com',
  cpf: '390.533.447-05',
  rg: '98765432',
  pixKeyType: 'CPF',
  pixKey: '390.533.447-05',
  termsAccepted: true,
};

export const ROGERIO = {
  fullName: 'Rogério Bastos',
  email: 'rogerio.bastos@email.com',
  cpf: '111.444.777-35',
  rg: '22334455',
  pixKeyType: 'EMAIL',
  pixKey: 'pix.rogerio@email.com',
  termsAccepted: true,
};

/** Cadastra pela rota pública, como a pessoa faria, e devolve o `publicId`. */
export async function register(app: INestApplication, body: object): Promise<string> {
  const response = await request(app.getHttpServer()).post('/v1/affiliates').send(body).expect(201);

  return response.body.publicId;
}

let issuedCoupons = 0;

/*
  Cada aprovação estreia um código porque o emissor — o falso como o real —
  nunca esquece o que já emitiu, e o `TRUNCATE` entre os testes não alcança a
  memória dele. Teste que precisa do mesmo código duas vezes guarda o retorno.
*/
export function nextCouponCode(): string {
  issuedCoupons += 1;

  return `CUPOM${issuedCoupons}`;
}

/** Aprova pelo caminho de produção e devolve o código do cupom emitido. */
export async function approve(
  app: INestApplication,
  operatorToken: string,
  publicId: string,
): Promise<string> {
  const couponCode = nextCouponCode();

  await request(app.getHttpServer())
    .post(`/v1/admin/affiliates/${publicId}/approve`)
    .set('Authorization', `Bearer ${operatorToken}`)
    .send({ couponCode, couponDiscountPercent: 10 })
    .expect(204);

  return couponCode;
}

/** O link com `token=` do último e-mail que foi para aquele endereço. */
export function lastLinkTo(mail: FakeMailProvider, email: string): URL {
  const text = mail.sentTo(email).at(-1)?.text ?? '';
  const link = text.match(/https?:\/\/[^\s\])>"]+token=[0-9a-f]+/)?.[0];

  if (!link) throw new Error(`Nenhum link com token no último e-mail para ${email}.`);

  return new URL(link);
}

export function tokenOf(link: URL): string {
  return link.searchParams.get('token') ?? '';
}
