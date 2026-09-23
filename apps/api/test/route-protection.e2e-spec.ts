import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryModule, DiscoveryService, MetadataScanner } from '@nestjs/core';
import { IS_PUBLIC } from '../src/http/shared/decorators/public.decorator';
import { AdminGuard } from '../src/http/shared/guards/admin.guard';
import { AffiliateGuard } from '../src/http/shared/guards/affiliate.guard';
import { WebhookSignatureGuard } from '../src/http/shared/guards/webhook-signature.guard';
import { createE2eTestingModule } from './e2e-app';

/**
 * A separação entre os canais mora numa linha por controller: o guard global
 * garante "token válido", e é o `@UseGuards` de canal que garante "token
 * **deste** canal". Esquecer essa linha num controller novo publica a rota para
 * qualquer sessão autenticada — inclusive a do outro público —, e nada em lint,
 * type-check ou build acusa.
 *
 * Este teste percorre as rotas que o container registrou de verdade, e não uma
 * lista escrita à mão: rota nova nasce coberta por ele.
 */
const CHANNEL_GUARDS = [AdminGuard, AffiliateGuard];

/**
 * As únicas rotas sem sessão. A lista é literal de propósito: abrir mais uma
 * passa a exigir editar este arquivo, o que transforma uma decisão de segurança
 * num diff que alguém revisa.
 *
 * As quatro de recuperação de senha são públicas pela mesma razão das outras
 * duas de senha: quem pede não tem sessão — é justamente o que ela perdeu —, e
 * quem autentica a redefinição é o token de uso único que chegou no e-mail.
 *
 * As de `webhooks/` são públicas só para o JWT: quem as chama é um sistema de
 * fora, que se autentica pela assinatura — e o teste abaixo cobra o guard dela.
 */
const PUBLIC_ROUTES = [
  'GET /health',
  'POST /affiliates',
  'POST /admin/auth/login',
  'POST /admin/auth/forgot-password',
  'POST /admin/auth/reset-password',
  'POST /affiliate/auth/login',
  'POST /affiliate/auth/set-password',
  'POST /affiliate/auth/forgot-password',
  'POST /affiliate/auth/reset-password',
  'POST /webhooks/porto/incentives',
];

const METHOD_NAMES = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

interface DiscoveredRoute {
  signature: string;
  isPublic: boolean;
  guards: unknown[];
}

function join(controllerPath: string, handlerPath: string): string {
  return `/${[controllerPath, handlerPath].filter((part) => part && part !== '/').join('/')}`;
}

describe('Route protection (e2e)', () => {
  let routes: DiscoveredRoute[];

  beforeAll(async () => {
    const moduleRef = await createE2eTestingModule([DiscoveryModule]).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const discovery = app.get(DiscoveryService);
    const scanner = app.get(MetadataScanner);

    routes = discovery.getControllers().flatMap((wrapper) => {
      const controller = wrapper.metatype;
      if (!controller || !wrapper.instance) return [];

      const prototype = Object.getPrototypeOf(wrapper.instance);
      const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) ?? '';

      return scanner
        .getAllMethodNames(prototype)
        .filter((name) => Reflect.hasMetadata(PATH_METADATA, prototype[name]))
        .map((name) => {
          const handler = prototype[name];
          const method = METHOD_NAMES[Reflect.getMetadata(METHOD_METADATA, handler)] ?? 'GET';
          const path = join(controllerPath, Reflect.getMetadata(PATH_METADATA, handler));

          return {
            signature: `${method} ${path}`,
            isPublic: Boolean(
              Reflect.getMetadata(IS_PUBLIC, handler) ?? Reflect.getMetadata(IS_PUBLIC, controller),
            ),
            guards: [
              ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []),
              ...(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []),
            ],
          };
        });
    });

    await app.close();
  });

  it('finds every route the container registered', () => {
    expect(routes.length).toBeGreaterThanOrEqual(13);
  });

  it('guards every route by channel unless it is explicitly public', () => {
    const unguarded = routes
      .filter((route) => !route.isPublic)
      .filter((route) => !route.guards.some((guard) => CHANNEL_GUARDS.includes(guard as never)))
      .map((route) => route.signature);

    expect(unguarded).toEqual([]);
  });

  it('opens exactly the routes that were meant to be open', () => {
    const publicRoutes = routes.filter((route) => route.isPublic).map((route) => route.signature);

    expect(publicRoutes.sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  /*
    O guard de canal certo, e não só algum: um `AffiliateGuard` num controller
    `admin/...` passaria no teste acima e abriria o painel para quem tem sessão
    de afiliado.
  */
  it('guards each route with the guard of the channel its path names', () => {
    const CHANNEL_GUARD_BY_PREFIX = [
      { prefix: '/admin/', guard: AdminGuard },
      { prefix: '/affiliate/', guard: AffiliateGuard },
    ];

    const mismatched = routes
      .filter((route) => !route.isPublic)
      .filter((route) => {
        const path = route.signature.split(' ')[1];
        const channel = CHANNEL_GUARD_BY_PREFIX.find(({ prefix }) => path.startsWith(prefix));

        return !channel || !route.guards.includes(channel.guard);
      })
      .map((route) => route.signature);

    expect(mismatched).toEqual([]);
  });

  /*
    Público para o guard global não é aberto: sem o guard de assinatura, a rota
    de webhook aceitaria de qualquer um uma venda inventada.
  */
  it('guards every webhook route with the signature guard', () => {
    const unsigned = routes
      .filter((route) => route.signature.split(' ')[1].startsWith('/webhooks/'))
      .filter((route) => !route.guards.includes(WebhookSignatureGuard))
      .map((route) => route.signature);

    expect(unsigned).toEqual([]);
  });

  it('never puts a channel guard on a public route', () => {
    // Guard de canal em rota pública é contradição: ou o `@Public()` está
    // sobrando, ou o guard está — e das duas, uma engana quem lê.
    const contradictory = routes
      .filter((route) => route.isPublic)
      .filter((route) => route.guards.some((guard) => CHANNEL_GUARDS.includes(guard as never)))
      .map((route) => route.signature);

    expect(contradictory).toEqual([]);
  });
});
